import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Payment, Prisma, PaymentStatus, PaymentType } from '@prisma/client';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentQueryDto,
  UploadProofDto,
} from './dto';

export interface PaymentWithDetails extends Payment {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  referrer?: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  orderRequest: {
    id: number;
    customerName: string;
    customerEmail: string;
    decidedPrice: any; // Using any to handle Prisma Decimal type
    status: string;
    product: {
      id: number;
      title: string;
      price: any; // Using any to handle Prisma Decimal type
      owner: {
        id: number;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    };
  };
}

export interface PaginatedPayments {
  payments: PaymentWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: number,
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentWithDetails> {
    // Check if order request exists
    const orderRequest = await this.prisma.orderRequest.findUnique({
      where: { id: createPaymentDto.orderRequestId },
      include: {
        product: {
          include: {
            owner: true,
          },
        },
        user: true,
      },
    });

    if (!orderRequest) {
      throw new NotFoundException('Order request not found');
    }

    // Validate that the user is either the order creator or product owner or admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const canCreatePayment =
      orderRequest.userId === userId ||
      orderRequest.product.ownerId === userId ||
      user.role === 'ADMIN';

    if (!canCreatePayment) {
      throw new ForbiddenException(
        'You can only create payments for your own orders or products',
      );
    }

    // Validate payment amounts
    if (createPaymentDto.totalPrice <= 0) {
      throw new BadRequestException('Total price must be greater than 0');
    }

    if (createPaymentDto.userShare <= 0) {
      throw new BadRequestException('User share must be greater than 0');
    }

    // Validate referrer if provided
    if (createPaymentDto.referrerId) {
      const referrer = await this.prisma.user.findUnique({
        where: { id: createPaymentDto.referrerId },
      });

      if (!referrer) {
        throw new BadRequestException('Referrer not found');
      }

      if (
        !createPaymentDto.referrerShare ||
        createPaymentDto.referrerShare <= 0
      ) {
        throw new BadRequestException(
          'Referrer share must be provided and greater than 0 when referrer is specified',
        );
      }
    }

    // Check if payment already exists for this order
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        orderRequestId: createPaymentDto.orderRequestId,
        paymentType: createPaymentDto.paymentType || PaymentType.SELLER,
      },
    });

    if (existingPayment) {
      throw new ConflictException(
        'Payment already exists for this order request',
      );
    }

    // Create the payment
    const payment = await this.prisma.payment.create({
      data: {
        orderRequestId: createPaymentDto.orderRequestId,
        userId: orderRequest.product.ownerId, // Payment goes to product owner
        userShare: createPaymentDto.userShare,
        referrerId: createPaymentDto.referrerId,
        referrerShare: createPaymentDto.referrerShare,
        totalPrice: createPaymentDto.totalPrice,
        proofScreenshotUrl: createPaymentDto.proofScreenshotUrl,
        paymentType: createPaymentDto.paymentType || PaymentType.SELLER,
        status: PaymentStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderRequest: {
          include: {
            product: {
              include: {
                owner: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return payment;
  }

  async findAll(query: PaymentQueryDto): Promise<PaginatedPayments> {
    const {
      page = 1,
      limit = 10,
      status,
      paymentType,
      userId,
      referrerId,
      orderRequestId,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (referrerId) {
      where.referrerId = referrerId;
    }

    if (orderRequestId) {
      where.orderRequestId = orderRequestId;
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    // Build order by clause
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          referrer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          orderRequest: {
            include: {
              product: {
                include: {
                  owner: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: number): Promise<PaymentWithDetails> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderRequest: {
          include: {
            product: {
              include: {
                owner: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findUserPayments(
    userId: number,
    query: PaymentQueryDto,
  ): Promise<PaginatedPayments> {
    const {
      page = 1,
      limit = 10,
      status,
      paymentType,
      orderRequestId,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause with user filter
    const where: Prisma.PaymentWhereInput = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (orderRequestId) {
      where.orderRequestId = orderRequestId;
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    // Build order by clause
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          referrer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          orderRequest: {
            include: {
              product: {
                include: {
                  owner: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findReferrerPayments(
    referrerId: number,
    query: PaymentQueryDto,
  ): Promise<PaginatedPayments> {
    const {
      page = 1,
      limit = 10,
      status,
      paymentType,
      orderRequestId,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause with referrer filter
    const where: Prisma.PaymentWhereInput = {
      referrerId,
    };

    if (status) {
      where.status = status;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (orderRequestId) {
      where.orderRequestId = orderRequestId;
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    // Build order by clause
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          referrer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          orderRequest: {
            include: {
              product: {
                include: {
                  owner: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async update(
    id: number,
    userId: number,
    userRole: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentWithDetails> {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        orderRequest: {
          include: {
            product: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!existingPayment) {
      throw new NotFoundException('Payment not found');
    }

    // Check permissions: payment recipient, order creator, product owner, or admin can update
    const canUpdate =
      existingPayment.userId === userId ||
      existingPayment.orderRequest.userId === userId ||
      existingPayment.orderRequest.product.ownerId === userId ||
      userRole === 'ADMIN';

    if (!canUpdate) {
      throw new ForbiddenException(
        'You can only update payments related to your orders or products',
      );
    }

    // Prepare update data
    const updateData: Partial<{
      status: PaymentStatus;
      proofScreenshotUrl: string | null;
      userShare: any;
      referrerShare: any;
      totalPrice: any;
    }> = {};

    // Only allow certain fields to be updated based on user role
    if (userRole === 'ADMIN') {
      // Admin can update everything
      if (updatePaymentDto.status !== undefined) {
        updateData.status = updatePaymentDto.status;
      }
      if (updatePaymentDto.proofScreenshotUrl !== undefined) {
        updateData.proofScreenshotUrl = updatePaymentDto.proofScreenshotUrl;
      }
      if (updatePaymentDto.userShare !== undefined) {
        updateData.userShare = updatePaymentDto.userShare;
      }
      if (updatePaymentDto.referrerShare !== undefined) {
        updateData.referrerShare = updatePaymentDto.referrerShare;
      }
      if (updatePaymentDto.totalPrice !== undefined) {
        updateData.totalPrice = updatePaymentDto.totalPrice;
      }
    } else {
      // Non-admin users can only update proof and limited fields
      if (updatePaymentDto.proofScreenshotUrl !== undefined) {
        updateData.proofScreenshotUrl = updatePaymentDto.proofScreenshotUrl;
      }

      // Product owner can mark as paid
      if (
        existingPayment.orderRequest.product.ownerId === userId &&
        updatePaymentDto.status
      ) {
        updateData.status = updatePaymentDto.status;
      }
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderRequest: {
          include: {
            product: {
              include: {
                owner: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return updatedPayment;
  }

  async uploadProof(
    id: number,
    userId: number,
    uploadProofDto: UploadProofDto,
  ): Promise<PaymentWithDetails> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        orderRequest: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check permissions: payment recipient or order creator can upload proof
    const canUpload =
      payment.userId === userId || payment.orderRequest.userId === userId;

    if (!canUpload) {
      throw new ForbiddenException(
        'You can only upload proof for your own payments',
      );
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        proofScreenshotUrl: uploadProofDto.proofScreenshotUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderRequest: {
          include: {
            product: {
              include: {
                owner: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return updatedPayment;
  }

  async remove(id: number, userId: number, userRole: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        orderRequest: {
          include: {
            product: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Only admin or payment recipient can delete payments
    const canDelete = userRole === 'ADMIN' || payment.userId === userId;

    if (!canDelete) {
      throw new ForbiddenException(
        'You can only delete your own payments or be an admin',
      );
    }

    await this.prisma.payment.delete({
      where: { id },
    });
  }

  async getPaymentStats(): Promise<{
    totalPayments: number;
    paymentsByStatus: Record<string, number>;
    paymentsByType: Record<string, number>;
    totalAmount: number;
    totalSellerAmount: number;
    totalReferrerAmount: number;
    recentPayments: number;
  }> {
    const [
      totalPayments,
      paymentsByStatus,
      paymentsByType,
      totalAmountResult,
      totalSellerAmountResult,
      totalReferrerAmountResult,
      recentPayments,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.payment.groupBy({
        by: ['paymentType'],
        _count: { paymentType: true },
      }),
      this.prisma.payment.aggregate({
        _sum: { totalPrice: true },
      }),
      this.prisma.payment.aggregate({
        _sum: { userShare: true },
      }),
      this.prisma.payment.aggregate({
        _sum: { referrerShare: true },
      }),
      this.prisma.payment.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const statusStats = paymentsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    const typeStats = paymentsByType.reduce(
      (acc, item) => {
        acc[item.paymentType] = item._count.paymentType;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalPayments,
      paymentsByStatus: statusStats,
      paymentsByType: typeStats,
      totalAmount: Number(totalAmountResult._sum.totalPrice) || 0,
      totalSellerAmount: Number(totalSellerAmountResult._sum.userShare) || 0,
      totalReferrerAmount:
        Number(totalReferrerAmountResult._sum.referrerShare) || 0,
      recentPayments,
    };
  }
}
