import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { CreateOrderRequestDto, OrderType } from './dto';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';
import { Prisma, OrderStatus } from '@prisma/client';
import { OrderRequestQueryDto } from './dto/order-request-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class OrderRequestService {
  private readonly logger = new Logger(OrderRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

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
      // Check for new array format
      if (
        createOrderRequestDto.customProducts &&
        Array.isArray(createOrderRequestDto.customProducts) &&
        createOrderRequestDto.customProducts.length > 0
      ) {
        // Validate each custom product
        for (const customProduct of createOrderRequestDto.customProducts) {
          if (
            !customProduct ||
            typeof customProduct !== 'object' ||
            !customProduct.name ||
            !customProduct.description
          ) {
            throw new BadRequestException(
              'Each custom product must have a name and description',
            );
          }
        }
      }
      // Fallback to old format for backward compatibility
      else if (
        createOrderRequestDto.customProductName &&
        createOrderRequestDto.customProductDescription
      ) {
        // Convert old format to new format
        createOrderRequestDto.customProducts = [
          {
            name: createOrderRequestDto.customProductName,
            description: createOrderRequestDto.customProductDescription,
            categoryId: createOrderRequestDto.categoryId,
            imageIndices:
              imageUrls.length > 0
                ? Array.from({ length: imageUrls.length }, (_, i) => i)
                : undefined,
          },
        ];
      } else {
        throw new BadRequestException(
          'Custom products array is required for custom product orders',
        );
      }
    }

    // Create order in transaction with extended timeout for image uploads
    return await this.prisma.$transaction(
      async (tx) => {
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
            customerEmail: createOrderRequestDto.customerEmail || '',
            customerNotes: createOrderRequestDto.customerNotes || null,
            deliveryAddress: createOrderRequestDto.deliveryAddress || null,
            deliveryDate: createOrderRequestDto.deliveryDate
              ? new Date(createOrderRequestDto.deliveryDate)
              : null,
            status: 'PENDING',
          },
        });

        // Create CustomProducts if needed
        if (
          createOrderRequestDto.orderType === OrderType.CUSTOM_PRODUCT &&
          createOrderRequestDto.customProducts &&
          Array.isArray(createOrderRequestDto.customProducts) &&
          createOrderRequestDto.customProducts.length > 0
        ) {
          // Get or create default category once
          let defaultCategory = await tx.category.findFirst({
            where: { name: 'OTHER' },
          });

          if (!defaultCategory) {
            defaultCategory = await tx.category.create({
              data: { name: 'OTHER' },
            });
          }

          // Type-safe iteration over custom products
          const customProducts = createOrderRequestDto.customProducts;
          for (const customProduct of customProducts) {
            // Type guard to ensure we have a valid custom product
            if (!customProduct || typeof customProduct !== 'object') {
              continue;
            }

            const categoryId = customProduct.categoryId || defaultCategory.id;

            // Map images based on imageIndices
            let productImages: string[] = [];
            if (
              customProduct.imageIndices &&
              Array.isArray(customProduct.imageIndices) &&
              customProduct.imageIndices.length > 0
            ) {
              productImages = customProduct.imageIndices
                .filter(
                  (index: number) =>
                    typeof index === 'number' &&
                    index >= 0 &&
                    index < imageUrls.length,
                )
                .map((index: number) => imageUrls[index]);
            }

            await tx.customProduct.create({
              data: {
                orderRequestId: orderRequest.id,
                name: customProduct.name,
                description: customProduct.description || null,
                categoryId: categoryId,
                images: productImages,
              },
            });
          }
        }

        // Fetch the complete order with all relations (consistent for both types)
        const completeOrder = await tx.orderRequest.findUnique({
          where: { id: orderRequest.id },
          include: {
            product: true,
            customProducts: {
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

        // Send notifications after transaction completes (non-blocking)
        setImmediate(() => {
          void (async () => {
            try {
              const orderType =
                createOrderRequestDto.orderType === OrderType.CUSTOM_PRODUCT
                  ? 'Custom Product'
                  : 'Existing Product';

              // Generate product name for notifications
              let productName = 'Product';
              if (
                createOrderRequestDto.orderType === OrderType.CUSTOM_PRODUCT
              ) {
                if (
                  completeOrder?.customProducts &&
                  completeOrder.customProducts.length > 0
                ) {
                  if (completeOrder.customProducts.length === 1) {
                    productName = completeOrder.customProducts[0].name;
                  } else {
                    productName = `${completeOrder.customProducts.length} Custom Products`;
                  }
                }
              } else {
                productName = completeOrder?.product?.title || 'Product';
              }

              // 1. Notify the user who created the order
              await this.notificationsService.createNotification({
                userId: userId,
                type: 'ORDER_UPDATE',
                title: 'Order Request Created',
                message: `Your order request #${orderRequest.id} for "${productName}" has been created successfully and is pending admin approval.`,
                actionUrl: `/orders/${orderRequest.id}`,
                referenceId: orderRequest.id,
                metadata: {
                  orderType,
                  status: 'PENDING',
                },
              });

              // 2. Notify all admins about the new order
              await this.notificationsService.createNotificationByRole(
                'ADMIN',
                'ORDER_UPDATE',
                'New Order Request',
                `New ${orderType.toLowerCase()} order request #${orderRequest.id} from ${completeOrder?.user?.firstName} ${completeOrder?.user?.lastName} for "${productName}". Amount: AED ${createOrderRequestDto.decidedPrice}`,
                {
                  actionUrl: `/admin-orders/${orderRequest.id}`,
                  referenceId: orderRequest.id,
                  metadata: {
                    orderType,
                    userId: userId,
                    customerName: createOrderRequestDto.customerName,
                    decidedPrice: createOrderRequestDto.decidedPrice,
                  },
                },
              );

              this.logger.log(
                `Notifications sent for order request ${orderRequest.id}`,
              );

              // 3. Send email notifications to all admin users
              try {
                const adminUsers = await this.prisma.user.findMany({
                  where: { role: 'ADMIN' },
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                });

                const sellerName =
                  `${completeOrder?.user?.firstName || ''} ${completeOrder?.user?.lastName || ''}`.trim() ||
                  completeOrder?.user?.email ||
                  'Unknown Seller';

                // Send email to each admin
                for (const admin of adminUsers) {
                  try {
                    const adminName =
                      `${admin.firstName || ''} ${admin.lastName || ''}`.trim() ||
                      admin.email;

                    await this.emailService.sendNewOrderNotificationEmail(
                      admin.email,
                      adminName,
                      orderRequest.id,
                      createOrderRequestDto.customerName,
                      productName,
                      Number(createOrderRequestDto.decidedPrice),
                      sellerName,
                      createOrderRequestDto.orderType ===
                        OrderType.CUSTOM_PRODUCT
                        ? 'CUSTOM_PRODUCT'
                        : 'EXISTING_PRODUCT',
                      createOrderRequestDto.deliveryDate
                        ? new Date(createOrderRequestDto.deliveryDate)
                        : null,
                    );

                    this.logger.log(
                      `Email sent to admin ${admin.email} for order ${orderRequest.id}`,
                    );
                  } catch (emailError) {
                    this.logger.error(
                      `Failed to send email to admin ${admin.email} for order ${orderRequest.id}`,
                      emailError,
                    );
                    // Continue with next admin even if one fails
                  }
                }
              } catch (error) {
                this.logger.error(
                  `Failed to fetch admin users or send emails for order ${orderRequest.id}`,
                  error,
                );
              }
            } catch (error) {
              this.logger.error(
                `Failed to send notifications for order ${orderRequest.id}`,
                error,
              );
            }
          })();
        });

        return completeOrder;
      },
      {
        maxWait: 30000, // 30 seconds
        timeout: 60000, // 60 seconds
      },
    );
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
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  referredBy: true,
                  referrer: {
                    select: {
                      id: true,
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
        customProducts: {
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
        customProducts: {
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
        orderSettlements: true,
      },
    });

    // Auto-create OrderSettlement when status changes to DELIVERED or PARTIALLY_DELIVERED
    if (
      userRole === 'ADMIN' &&
      updateData.status &&
      (updateData.status === OrderStatus.DELIVERED ||
        updateData.status === OrderStatus.PARTIALLY_DELIVERED) &&
      existingOrder.status !== updateData.status
    ) {
      try {
        // Check if OrderSettlement already exists
        const existingSettlement = await this.prisma.orderSettlement.findFirst({
          where: { orderRequestId },
        });

        if (!existingSettlement) {
          this.logger.log(
            `Auto-creating OrderSettlement for order ${orderRequestId}`,
          );

          // Get seller info for referrer details
          const orderWithUser = await this.prisma.orderRequest.findUnique({
            where: { id: orderRequestId },
            include: {
              user: {
                include: {
                  profile: {
                    include: {
                      referrer: true,
                    },
                  },
                },
              },
            },
          });

          const referrerId = orderWithUser?.user.profile?.referredBy;
          const referrerRole = orderWithUser?.user.profile?.referrer?.role;

          // Create OrderSettlement with placeholder values
          await this.prisma.orderSettlement.create({
            data: {
              orderRequestId,
              totalAmount: updatedOrder.decidedPrice,
              productCost: new Prisma.Decimal(0),
              adminCommission: new Prisma.Decimal(0),
              grossSellerAmount: new Prisma.Decimal(0),
              referralCommission: null,
              referralCommissionRate: null,
              isFixedCommission: false,
              netSellerAmount: new Prisma.Decimal(0),
              referrerId: referrerId || null,
              referrerRole: referrerRole || null,
              status: 'PENDING',
            },
          });

          this.logger.log(
            `OrderSettlement created for order ${orderRequestId}. Admin can now fill in the amounts.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to create OrderSettlement for order ${orderRequestId}`,
          error,
        );
      }
    }

    // Send notifications after update (non-blocking)
    setImmediate(() => {
      void (async () => {
        try {
          const productName =
            updatedOrder.product?.title ||
            updatedOrder.customProducts?.[0]?.name ||
            'Order';

          // 1. If admin changed the status, notify the user
          if (
            userRole === 'ADMIN' &&
            updateData.status &&
            existingOrder.status !== updateData.status
          ) {
            const statusMessages: Record<OrderStatus, string> = {
              PENDING: 'is now pending review',
              CONFIRMED: 'has been confirmed',
              IN_PROGRESS: 'is now in progress',
              PAYMENT_PENDING: 'is awaiting payment',
              DELIVERED: 'has been delivered',
              PARTIALLY_DELIVERED: 'has been partially delivered',
              CANCELLED: 'has been cancelled',
            };

            await this.notificationsService.createNotification({
              userId: updatedOrder.userId,
              type: 'ORDER_UPDATE',
              title: 'Order Status Updated',
              message: `Your order #${orderRequestId} for "${productName}" ${statusMessages[updateData.status] || 'has been updated'}.`,
              actionUrl: `/admin-orders/${orderRequestId}`,
              referenceId: orderRequestId,
              metadata: {
                oldStatus: existingOrder.status,
                newStatus: updateData.status,
                updatedBy: 'admin',
              },
            });

            this.logger.log(
              `Status change notification sent for order ${orderRequestId}`,
            );

            // Send delivery email notifications if status changed to DELIVERED
            if (updateData.status === OrderStatus.DELIVERED) {
              await this.notifyOrderDelivery(updatedOrder);
            }
          }

          // 2. If user updated order details, notify admins
          if (userRole !== 'ADMIN') {
            const updatedFields: string[] = [];
            if (updateData.customerName !== undefined)
              updatedFields.push('customer name');
            if (updateData.customerPhone !== undefined)
              updatedFields.push('phone');
            if (updateData.decidedPrice !== undefined)
              updatedFields.push('price');
            if (updateData.deliveryAddress !== undefined)
              updatedFields.push('delivery address');
            if (updateData.deliveryDate !== undefined)
              updatedFields.push('delivery date');
            if (updateData.customerNotes !== undefined)
              updatedFields.push('notes');
            if (updateData.advancePayment !== undefined)
              updatedFields.push('advance payment');

            if (updatedFields.length > 0) {
              await this.notificationsService.createNotificationByRole(
                'ADMIN',
                'ORDER_UPDATE',
                'Order Updated by User',
                `Order #${orderRequestId} for "${productName}" was updated by ${updatedOrder.user?.firstName} ${updatedOrder.user?.lastName}. Updated: ${updatedFields.join(', ')}.`,
                {
                  actionUrl: `/orders/${orderRequestId}`,
                  referenceId: orderRequestId,
                  metadata: {
                    userId: updatedOrder.userId,
                    updatedFields,
                  },
                },
              );

              this.logger.log(
                `User update notification sent to admins for order ${orderRequestId}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to send update notifications for order ${orderRequestId}`,
            error,
          );
        }
      })();
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

  /**
   * Notify users when order is delivered
   */
  private async notifyOrderDelivery(order: {
    id: number;
    userId: number;
    decidedPrice: any;
    product?: { title: string } | null;
    customProducts?: { name: string }[] | null;
  }) {
    try {
      // Get order user with referral manager details
      const orderUser = await this.prisma.user.findUnique({
        where: { id: order.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          profile: {
            select: {
              fullName: true,
              referredBy: true,
              referrer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  profile: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!orderUser) return;

      // Generate product name for email
      const productName =
        order.product?.title ||
        order.customProducts?.[0]?.name ||
        `${order.customProducts?.length || 0} Custom Products` ||
        'Order';

      const customerName =
        orderUser.profile?.fullName ||
        `${orderUser.firstName || ''} ${orderUser.lastName || ''}`.trim() ||
        orderUser.email;

      // 1. Send email to order user (exclude admins)
      if (orderUser.role !== 'ADMIN') {
        try {
          await this.emailService.sendOrderDeliveryEmail(
            orderUser.email,
            customerName,
            order.id,
            productName,
            Number(order.decidedPrice),
            customerName,
            false, // isReferralManager = false
          );

          this.logger.log(
            `Delivery email sent to customer for order ${order.id}`,
          );
        } catch (emailError) {
          this.logger.error(
            `Failed to send delivery email to customer for order ${order.id}:`,
            emailError,
          );
        }
      }

      // 2. Send email to referral manager (if exists and not admin)
      if (
        orderUser.profile?.referrer &&
        orderUser.profile.referrer.role !== 'ADMIN'
      ) {
        try {
          const referralManagerName =
            orderUser.profile.referrer.profile?.fullName ||
            `${orderUser.profile.referrer.firstName || ''} ${orderUser.profile.referrer.lastName || ''}`.trim() ||
            orderUser.profile.referrer.email;

          await this.emailService.sendOrderDeliveryEmail(
            orderUser.profile.referrer.email,
            referralManagerName,
            order.id,
            productName,
            Number(order.decidedPrice),
            customerName,
            true, // isReferralManager = true
          );

          this.logger.log(
            `Delivery email sent to referral manager for order ${order.id}`,
          );
        } catch (emailError) {
          this.logger.error(
            `Failed to send delivery email to referral manager for order ${order.id}:`,
            emailError,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to send delivery notifications for order ${order.id}:`,
        error,
      );
    }
  }
}
