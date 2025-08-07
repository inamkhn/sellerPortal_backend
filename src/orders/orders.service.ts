import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { OrderRequest, Prisma, OrderStatus } from '@prisma/client';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto } from './dto';

export interface OrderWithDetails extends OrderRequest {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  product: {
    id: number;
    title: string;
    description: string | null;
    price: any; // Using any to handle Prisma Decimal type
    category: string;
    condition: string;
    photos: string[];
    owner: {
      id: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  };
  payments: {
    id: number;
    totalPrice: any; // Using any to handle Prisma Decimal type
    status: string;
    createdAt: Date;
  }[];
}

export interface PaginatedOrders {
  orders: OrderWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: number,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderWithDetails> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createOrderDto.productId },
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
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate decided price is reasonable (not negative)
    if (createOrderDto.decidedPrice <= 0) {
      throw new BadRequestException('Decided price must be greater than 0');
    }

    // Create the order request
    const order = await this.prisma.orderRequest.create({
      data: {
        userId,
        productId: createOrderDto.productId,
        platform: createOrderDto.platform,
        decidedPrice: createOrderDto.decidedPrice,
        advancePayment: createOrderDto.advancePayment || false,
        customerName: createOrderDto.customerName,
        customerPhone: createOrderDto.customerPhone,
        customerWhatsapp: createOrderDto.customerWhatsapp,
        customerEmail: createOrderDto.customerEmail,
        customerNotes: createOrderDto.customerNotes,
        productName: createOrderDto.productName,
        productDescription: createOrderDto.productDescription,
        customize_images: createOrderDto.customizeImages || [],
        deliveringDate: createOrderDto.deliveringDate
          ? new Date(createOrderDto.deliveringDate)
          : null,
        deliveryAddress: createOrderDto.deliveryAddress,
        deliveryDate: createOrderDto.deliveryDate
          ? new Date(createOrderDto.deliveryDate)
          : null,
        status: OrderStatus.PENDING,
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
        payments: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return order;
  }

  async findAll(query: OrderQueryDto): Promise<PaginatedOrders> {
    const {
      page = 1,
      limit = 10,
      status,
      customerName,
      customerEmail,
      productId,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.OrderRequestWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }

    if (customerEmail) {
      where.customerEmail = { contains: customerEmail, mode: 'insensitive' };
    }

    if (productId) {
      where.productId = productId;
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
    const orderBy: Prisma.OrderRequestOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [orders, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
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
          payments: {
            select: {
              id: true,
              totalPrice: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      orders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: number): Promise<OrderWithDetails> {
    const order = await this.prisma.orderRequest.findUnique({
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
        payments: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findUserOrders(
    userId: number,
    query: OrderQueryDto,
  ): Promise<PaginatedOrders> {
    const {
      page = 1,
      limit = 10,
      status,
      productId,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause with user filter
    const where: Prisma.OrderRequestWhereInput = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.productId = productId;
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
    const orderBy: Prisma.OrderRequestOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [orders, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
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
          payments: {
            select: {
              id: true,
              totalPrice: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      orders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findProductOrders(
    productId: number,
    userId: number,
    query: OrderQueryDto,
  ): Promise<PaginatedOrders> {
    // First verify that the user owns the product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only view orders for your own products',
      );
    }

    const {
      page = 1,
      limit = 10,
      status,
      customerName,
      customerEmail,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause with product filter
    const where: Prisma.OrderRequestWhereInput = {
      productId,
    };

    if (status) {
      where.status = status;
    }

    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }

    if (customerEmail) {
      where.customerEmail = { contains: customerEmail, mode: 'insensitive' };
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
    const orderBy: Prisma.OrderRequestOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [orders, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
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
          payments: {
            select: {
              id: true,
              totalPrice: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      orders,
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
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderWithDetails> {
    const existingOrder = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions: user can update their own orders, product owner can update orders for their products, admin can update any
    const canUpdate =
      existingOrder.userId === userId ||
      existingOrder.product.ownerId === userId ||
      userRole === 'ADMIN';

    if (!canUpdate) {
      throw new ForbiddenException(
        'You can only update your own orders or orders for your products',
      );
    }

    // Prepare update data
    const updateData: Partial<{
      status: OrderStatus;
      deliveringDate: Date | null;
      deliveryDate: Date | null;
      customerName: string;
      customerPhone: string;
      customerWhatsapp: string;
      customerEmail: string;
      customerNotes: string | null;
      deliveryAddress: string | null;
    }> = {};

    // Only allow certain fields to be updated based on user role
    if (userRole === 'ADMIN' || existingOrder.product.ownerId === userId) {
      // Product owner or admin can update status and delivery info
      if (updateOrderDto.status !== undefined) {
        updateData.status = updateOrderDto.status;
      }
      if (updateOrderDto.deliveringDate !== undefined) {
        updateData.deliveringDate = updateOrderDto.deliveringDate
          ? new Date(updateOrderDto.deliveringDate)
          : null;
      }
      if (updateOrderDto.deliveryDate !== undefined) {
        updateData.deliveryDate = updateOrderDto.deliveryDate
          ? new Date(updateOrderDto.deliveryDate)
          : null;
      }
    }

    // Order creator can update customer info and notes
    if (existingOrder.userId === userId) {
      if (updateOrderDto.customerName !== undefined) {
        updateData.customerName = updateOrderDto.customerName;
      }
      if (updateOrderDto.customerPhone !== undefined) {
        updateData.customerPhone = updateOrderDto.customerPhone;
      }
      if (updateOrderDto.customerWhatsapp !== undefined) {
        updateData.customerWhatsapp = updateOrderDto.customerWhatsapp;
      }
      if (updateOrderDto.customerEmail !== undefined) {
        updateData.customerEmail = updateOrderDto.customerEmail;
      }
      if (updateOrderDto.customerNotes !== undefined) {
        updateData.customerNotes = updateOrderDto.customerNotes;
      }
      if (updateOrderDto.deliveryAddress !== undefined) {
        updateData.deliveryAddress = updateOrderDto.deliveryAddress;
      }
    }

    const updatedOrder = await this.prisma.orderRequest.update({
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
        payments: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return updatedOrder;
  }

  async remove(id: number, userId: number, userRole: string): Promise<void> {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions: user can delete their own orders, product owner can delete orders for their products, admin can delete any
    const canDelete =
      order.userId === userId ||
      order.product.ownerId === userId ||
      userRole === 'ADMIN';

    if (!canDelete) {
      throw new ForbiddenException(
        'You can only delete your own orders or orders for your products',
      );
    }

    await this.prisma.orderRequest.delete({
      where: { id },
    });
  }

  async getOrderStats(): Promise<{
    totalOrders: number;
    ordersByStatus: Record<string, number>;
    averageOrderValue: number;
    recentOrders: number;
  }> {
    const [totalOrders, ordersByStatus, averageOrderValue, recentOrders] =
      await Promise.all([
        this.prisma.orderRequest.count(),
        this.prisma.orderRequest.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        this.prisma.orderRequest.aggregate({
          _avg: { decidedPrice: true },
        }),
        this.prisma.orderRequest.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ]);

    const statusStats = ordersByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalOrders,
      ordersByStatus: statusStats,
      averageOrderValue: Number(averageOrderValue._avg.decidedPrice) || 0,
      recentOrders,
    };
  }
}
