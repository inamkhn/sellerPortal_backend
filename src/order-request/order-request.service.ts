import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { CreateOrderRequestDto, OrderType } from './dto';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';
import { Prisma, OrderStatus } from '@prisma/client';
import { OrderRequestQueryDto } from './dto/order-request-query.dto';

@Injectable()
export class OrderRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    createOrderRequestDto: CreateOrderRequestDto,
    imageUrls: string[] = [],
  ) {
    // Validate existing product
    if (createOrderRequestDto.orderType === OrderType.EXISTING_PRODUCT) {
      if (!createOrderRequestDto.productId) {
        throw new BadRequestException(
          'Product ID is required for existing products',
        );
      }
    }

    // Validate custom product
    if (createOrderRequestDto.orderType === OrderType.CUSTOM_PRODUCT) {
      if (
        !createOrderRequestDto.customProductName ||
        !createOrderRequestDto.customProductDescription
      ) {
        throw new BadRequestException(
          'Custom product name and description are required',
        );
      }
    }

    // Create order in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Create OrderRequest
      const orderRequest = await tx.orderRequest.create({
        data: {
          userId: userId,
          productId:
            createOrderRequestDto.orderType === OrderType.EXISTING_PRODUCT
              ? createOrderRequestDto.productId
              : null,
          isCustomProduct:
            createOrderRequestDto.orderType === OrderType.CUSTOM_PRODUCT,
          platform: createOrderRequestDto.platform,
          decidedPrice: createOrderRequestDto.decidedPrice,
          advancePayment: createOrderRequestDto.advancePayment,
          advancePay: createOrderRequestDto.advancePay || null,
          customerName: createOrderRequestDto.customerName,
          customerPhone: createOrderRequestDto.customerPhone,
          customerWhatsapp: createOrderRequestDto.customerWhatsapp,
          customerEmail: createOrderRequestDto.customerEmail,
          customerNotes: createOrderRequestDto.customerNotes || null,
          deliveryAddress: createOrderRequestDto.deliveryAddress || null,
          deliveryDate: createOrderRequestDto.deliveryDate
            ? new Date(createOrderRequestDto.deliveryDate)
            : null,
          status: 'PENDING',
        },
        include: {
          product: true,
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      // Create CustomProduct if needed
      if (createOrderRequestDto.orderType === OrderType.CUSTOM_PRODUCT) {
        let categoryId = createOrderRequestDto.categoryId;

        // Get or create default category
        if (!categoryId) {
          let category = await tx.category.findFirst({
            where: { name: 'OTHER' },
          });

          if (!category) {
            category = await tx.category.create({
              data: { name: 'OTHER' },
            });
          }

          categoryId = category.id;
        }

        await tx.customProduct.create({
          data: {
            orderRequestId: orderRequest.id,
            name: createOrderRequestDto.customProductName!,
            description: createOrderRequestDto.customProductDescription || null,
            categoryId: categoryId,
            images: imageUrls,
          },
        });

        // Fetch the complete order with custom product
        return await tx.orderRequest.findUnique({
          where: { id: orderRequest.id },
          include: {
            product: true,
            customProduct: {
              include: {
                category: true,
              },
            },
            user: {
              include: {
                profile: true,
              },
            },
          },
        });
      }

      return orderRequest;
    });
  }

  async findAll(userId: number, userRole: string, query: OrderRequestQueryDto) {
    const page: number = query.page ?? 1;
    const limit: number = query.limit ?? 10;
    const search: string | undefined = query.search;
    const status: OrderStatus | undefined = query.status;
    const createdFrom: string | undefined = query.createdFrom;
    const createdTo: string | undefined = query.createdTo;
    const sortOrder: 'asc' | 'desc' = query.sortOrder ?? 'desc';

    const skip = (page - 1) * limit;
    const where: Prisma.OrderRequestWhereInput = {};

    // Role-based filtering
    if (userRole === 'ADMIN') {
      // Admin can see all order requests - no userId filter
    } else if (userRole === 'REFERRAL_MANAGER') {
      // Referral manager can see their own orders + orders from their referrals
      const referredUsers = await this.prisma.referral.findMany({
        where: { referrerId: userId },
        select: { refereeId: true },
      });

      const referredUserIds = referredUsers.map((r) => r.refereeId);

      where.userId = {
        in: [userId, ...referredUserIds], // Own orders + referral orders
      };
    } else {
      // Regular USER can only see their own orders
      where.userId = userId;
    }

    // Search filter (customer name, email, or phone)
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { customerWhatsapp: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date range filter
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) {
        where.createdAt.gte = new Date(createdFrom);
      }
      if (createdTo) {
        where.createdAt.lte = new Date(createdTo);
      }
    }

    const [orderRequests, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: sortOrder,
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              photos: true,
            },
          },
          customProduct: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      orderRequests,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(orderRequestId: number, userId: number, userRole: string) {
    const orderRequest = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            photos: true,
            description: true,
            condition: true,
            brand: true,
            colors: true,
            location: true,
            material: true,
          },
        },
        customProduct: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                fullName: true,
                whatsappNumber: true,
              },
            },
          },
        },
      },
    });

    if (!orderRequest) {
      throw new NotFoundException('Order request not found');
    }

    // Role-based access control
    if (userRole === 'ADMIN') {
      // Admin can access any order
      return orderRequest;
    } else if (userRole === 'REFERRAL_MANAGER') {
      // Referral manager can access their own orders + orders from their referrals
      if (orderRequest.userId === userId) {
        return orderRequest;
      }

      const isReferredUser = await this.prisma.referral.findFirst({
        where: {
          referrerId: userId,
          refereeId: orderRequest.userId,
        },
      });

      if (!isReferredUser) {
        throw new ForbiddenException(
          'You do not have permission to access this order request',
        );
      }

      return orderRequest;
    } else {
      // Regular USER can only access their own orders
      if (orderRequest.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this order request',
        );
      }

      return orderRequest;
    }
  }

  async update(
    orderRequestId: number,
    userId: number,
    userRole: string,
    updateData: UpdateOrderRequestDto,
  ) {
    // First, check if the order exists and user has permission
    const existingOrder = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order request not found');
    }

    // Role-based access control for updates
    if (userRole === 'ADMIN') {
      // Admin can update any order and change status
    } else if (userRole === 'REFERRAL_MANAGER') {
      // Referral manager can update their own orders + orders from their referrals
      if (existingOrder.userId !== userId) {
        const isReferredUser = await this.prisma.referral.findFirst({
          where: {
            referrerId: userId,
            refereeId: existingOrder.userId,
          },
        });

        if (!isReferredUser) {
          throw new ForbiddenException(
            'You do not have permission to update this order request',
          );
        }
      }

      // Non-admin cannot change status
      if (updateData.status) {
        throw new ForbiddenException('Only admins can change order status');
      }
    } else {
      // Regular USER can only update their own orders
      if (existingOrder.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to update this order request',
        );
      }

      // Non-admin cannot change status
      if (updateData.status) {
        throw new ForbiddenException('Only admins can change order status');
      }
    }

    // Prepare update data
    const dataToUpdate: Prisma.OrderRequestUpdateInput = {};

    if (updateData.customerName !== undefined) {
      dataToUpdate.customerName = updateData.customerName;
    }
    if (updateData.customerPhone !== undefined) {
      dataToUpdate.customerPhone = updateData.customerPhone;
    }
    if (updateData.customerWhatsapp !== undefined) {
      dataToUpdate.customerWhatsapp = updateData.customerWhatsapp;
    }
    if (updateData.customerEmail !== undefined) {
      dataToUpdate.customerEmail = updateData.customerEmail;
    }
    if (updateData.customerNotes !== undefined) {
      dataToUpdate.customerNotes = updateData.customerNotes;
    }
    if (updateData.decidedPrice !== undefined) {
      dataToUpdate.decidedPrice = updateData.decidedPrice;
    }
    if (updateData.platform !== undefined) {
      dataToUpdate.platform = updateData.platform;
    }
    if (updateData.advancePayment !== undefined) {
      dataToUpdate.advancePayment = updateData.advancePayment;
    }
    if (updateData.advancePay !== undefined) {
      dataToUpdate.advancePay = updateData.advancePay;
    }
    if (updateData.deliveryAddress !== undefined) {
      dataToUpdate.deliveryAddress = updateData.deliveryAddress;
    }
    if (updateData.deliveryDate !== undefined) {
      dataToUpdate.deliveryDate = updateData.deliveryDate
        ? new Date(updateData.deliveryDate)
        : null;
    }

    // Only admin can update status
    if (userRole === 'ADMIN' && updateData.status !== undefined) {
      dataToUpdate.status = updateData.status;
    }

    // Update the order
    const updatedOrder = await this.prisma.orderRequest.update({
      where: { id: orderRequestId },
      data: dataToUpdate,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            photos: true,
            description: true,
            condition: true,
            brand: true,
            colors: true,
            location: true,
            material: true,
          },
        },
        customProduct: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                fullName: true,
                whatsappNumber: true,
              },
            },
          },
        },
      },
    });

    return updatedOrder;
  }

  async remove(orderRequestId: number, userId: number, userRole: string) {
    // First, check if the order exists and user has permission
    const existingOrder = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order request not found');
    }

    // Role-based access control for deletion
    if (userRole === 'ADMIN') {
      // Admin can delete any order
    } else if (userRole === 'REFERRAL_MANAGER') {
      // Referral manager can delete their own orders + orders from their referrals
      if (existingOrder.userId !== userId) {
        const isReferredUser = await this.prisma.referral.findFirst({
          where: {
            referrerId: userId,
            refereeId: existingOrder.userId,
          },
        });

        if (!isReferredUser) {
          throw new ForbiddenException(
            'You do not have permission to delete this order request',
          );
        }
      }
    } else {
      // Regular USER can only delete their own orders
      if (existingOrder.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to delete this order request',
        );
      }
    }

    // Delete the order (cascade will handle related records)
    await this.prisma.orderRequest.delete({
      where: { id: orderRequestId },
    });

    return;
  }
}
