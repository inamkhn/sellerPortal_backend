import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import {
  CreateSettlementDto,
  UpdateSettlementDto,
  SettlementQueryDto,
} from './dto';
import {
  OrderSettlement,
  Settlement,
  SettlementStatus,
  OrderSettlementStatus,
  SettlementType,
  Role,
  Prisma,
} from '@prisma/client';

@Injectable()
export class OrderSettlementService {
  constructor(private readonly database: PrismaService) {}

  /**
   * Create/Update OrderSettlement and create Settlement records (Admin fills in amounts and creates payment records)
   */
  async createSettlement(
    dto: CreateSettlementDto,
    adminId: number,
  ): Promise<{
    orderSettlement: OrderSettlement;
    settlements: Settlement[];
    status: OrderSettlementStatus;
  }> {
    // Get order request with seller and referrer info
    const orderRequest = await this.database.orderRequest.findUnique({
      where: { id: dto.orderRequestId },
      include: {
        user: {
          include: {
            profile: {
              include: {
                referrer: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!orderRequest) {
      throw new NotFoundException('Order request not found');
    }

    // Check if settlement already exists
    const existingSettlement = await this.database.orderSettlement.findFirst({
      where: { orderRequestId: dto.orderRequestId },
      include: { settlements: true },
    });

    // If settlement exists and already has Settlement records, don't allow recreation
    if (existingSettlement && existingSettlement.settlements.length > 0) {
      throw new BadRequestException(
        'Settlement records already exist for this order',
      );
    }

    const totalAmount = Number(orderRequest.decidedPrice);
    const productCost = dto.productCost;
    const adminCommission = dto.adminCommission;

    // Calculate Gross Seller Amount
    const grossSellerAmount = totalAmount - productCost - adminCommission;

    if (grossSellerAmount < 0) {
      throw new BadRequestException(
        'Gross seller amount cannot be negative. Check product cost and admin commission.',
      );
    }

    const sellerId = orderRequest.userId;
    const referrerId = orderRequest.user.profile?.referredBy;
    let referrerRole: Role | null = null;
    let referralCommission: number | null = null;
    let referralCommissionRate: number | null = null;
    let isFixedCommission = false;
    let netSellerAmount = grossSellerAmount;
    let orderSettlementStatus: OrderSettlementStatus =
      OrderSettlementStatus.SETTLED;
    let shouldCreateSettlements = true;

    // Check if seller has a referrer
    if (referrerId) {
      const referrer = orderRequest.user.profile?.referrer;
      referrerRole = referrer?.role || Role.USER;

      if (referrerRole === Role.USER) {
        // USER referrer: 10% fixed commission
        referralCommissionRate = 10;
        referralCommission = (grossSellerAmount * referralCommissionRate) / 100;
        isFixedCommission = true;
        netSellerAmount = grossSellerAmount - referralCommission;
        orderSettlementStatus = OrderSettlementStatus.SETTLED;
        shouldCreateSettlements = true;
      } else if (referrerRole === Role.REFERRAL_MANAGER) {
        // REFERRAL_MANAGER: Awaits manager input - DO NOT create settlements yet
        referralCommission = null;
        referralCommissionRate = null;
        isFixedCommission = false;
        netSellerAmount = grossSellerAmount; // Temporary, will be updated
        orderSettlementStatus = OrderSettlementStatus.MANAGER_PENDING;
        shouldCreateSettlements = false; // Wait for manager to set commission
      }
    }

    // Update existing OrderSettlement or create new one, and create Settlement records in a transaction
    const result = await this.database.$transaction(async (tx) => {
      let orderSettlement: OrderSettlement;

      if (existingSettlement) {
        // Update existing OrderSettlement with admin's values
        orderSettlement = await tx.orderSettlement.update({
          where: { id: existingSettlement.id },
          data: {
            productCost: new Prisma.Decimal(productCost),
            adminCommission: new Prisma.Decimal(adminCommission),
            grossSellerAmount: new Prisma.Decimal(grossSellerAmount),
            referralCommission: referralCommission
              ? new Prisma.Decimal(referralCommission)
              : null,
            referralCommissionRate: referralCommissionRate
              ? new Prisma.Decimal(referralCommissionRate)
              : null,
            isFixedCommission,
            netSellerAmount: new Prisma.Decimal(netSellerAmount),
            adminSettledBy: adminId,
            adminSettledAt: new Date(),
            notes: dto.notes,
            status: orderSettlementStatus,
          },
        });
      } else {
        // Create new OrderSettlement
        orderSettlement = await tx.orderSettlement.create({
          data: {
            orderRequestId: dto.orderRequestId,
            totalAmount: new Prisma.Decimal(totalAmount),
            productCost: new Prisma.Decimal(productCost),
            adminCommission: new Prisma.Decimal(adminCommission),
            grossSellerAmount: new Prisma.Decimal(grossSellerAmount),
            referralCommission: referralCommission
              ? new Prisma.Decimal(referralCommission)
              : null,
            referralCommissionRate: referralCommissionRate
              ? new Prisma.Decimal(referralCommissionRate)
              : null,
            isFixedCommission,
            netSellerAmount: new Prisma.Decimal(netSellerAmount),
            referrerId: referrerId || null,
            referrerRole: referrerRole,
            adminSettledBy: adminId,
            adminSettledAt: new Date(),
            notes: dto.notes,
            status: orderSettlementStatus,
          },
        });
      }

      const settlements: Settlement[] = [];

      // Only create settlements if not waiting for REFERRAL_MANAGER input
      if (shouldCreateSettlements) {
        // Create SELLER_PAYMENT Settlement
        const sellerSettlement = await tx.settlement.create({
          data: {
            orderSettlementId: orderSettlement.id,
            userId: sellerId,
            settlementType: SettlementType.SELLER_PAYMENT,
            amount: new Prisma.Decimal(netSellerAmount),
            status: SettlementStatus.PENDING,
          },
        });
        settlements.push(sellerSettlement);

        // Create REFERRAL_PAYMENT Settlement (if USER referrer)
        if (referrerId && referrerRole === Role.USER && referralCommission) {
          const referralSettlement = await tx.settlement.create({
            data: {
              orderSettlementId: orderSettlement.id,
              userId: referrerId,
              settlementType: SettlementType.REFERRAL_PAYMENT,
              amount: new Prisma.Decimal(referralCommission),
              status: SettlementStatus.PENDING,
            },
          });
          settlements.push(referralSettlement);
        }

        // Create ADMIN_COMMISSION Settlement
        const adminSettlement = await tx.settlement.create({
          data: {
            orderSettlementId: orderSettlement.id,
            userId: adminId,
            settlementType: SettlementType.ADMIN_COMMISSION,
            amount: new Prisma.Decimal(adminCommission),
            status: SettlementStatus.PAID, // Admin commission is auto-paid
            paidAt: new Date(),
          },
        });
        settlements.push(adminSettlement);
      }

      return { orderSettlement, settlements };
    });

    return {
      ...result,
      status: orderSettlementStatus,
    };
  }

  /**
   * Get all OrderSettlements (filtered by role)
   * - Admin: sees all settlements
   * - User: sees only their own settlements (as seller)
   * - Referral Manager: sees settlements where they are the referrer
   */
  async findAll(query: SettlementQueryDto, userId: number, userRole: Role) {
    const { status, page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderSettlementWhereInput = {};

    // Role-based filtering
    if (userRole === Role.USER) {
      // Users see only their own settlements (as seller)
      where.orderRequest = {
        userId: userId,
      };
    } else if (userRole === Role.REFERRAL_MANAGER) {
      // Referral managers see settlements where they are the referrer
      where.referrerId = userId;
    }
    // Admin sees all (no additional filter)

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          orderRequest: {
            user: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [settlements, total] = await Promise.all([
      this.database.orderSettlement.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderRequest: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.database.orderSettlement.count({ where }),
    ]);

    return {
      data: settlements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get OrderSettlement details by ID (filtered by role)
   * - Admin: can view any settlement
   * - User: can only view their own settlements (as seller)
   * - Referral Manager: can only view settlements where they are the referrer
   */
  async findOne(id: number, userId: number, userRole: Role) {
    const orderSettlement = await this.database.orderSettlement.findUnique({
      where: { id },
      include: {
        orderRequest: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        referrer: {
          include: {
            profile: true,
          },
        },
        settlements: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!orderSettlement) {
      throw new NotFoundException('Settlement not found');
    }

    // Check access permissions
    if (userRole === Role.USER) {
      // Users can only view their own settlements (as seller)
      if (orderSettlement.orderRequest.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to view this settlement',
        );
      }
    } else if (userRole === Role.REFERRAL_MANAGER) {
      // Referral managers can only view settlements where they are the referrer
      if (orderSettlement.referrerId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to view this settlement',
        );
      }
    }
    // Admin can view any settlement (no additional check)

    return orderSettlement;
  }

  /**
   * Update OrderSettlement (Admin only)
   */
  async update(id: number, dto: UpdateSettlementDto, adminId: number) {
    // Admin can view any settlement, so we pass admin role
    const existing = await this.findOne(id, adminId, Role.ADMIN);

    if (
      existing.status !== OrderSettlementStatus.PENDING &&
      existing.status !== OrderSettlementStatus.MANAGER_PENDING
    ) {
      throw new BadRequestException(
        'Cannot update settlement that is not in PENDING or MANAGER_PENDING status',
      );
    }

    const totalAmount = Number(existing.totalAmount);
    const productCost = dto.productCost ?? Number(existing.productCost);
    const adminCommission =
      dto.adminCommission ?? Number(existing.adminCommission);

    const grossSellerAmount = totalAmount - productCost - adminCommission;

    if (grossSellerAmount < 0) {
      throw new BadRequestException('Gross seller amount cannot be negative');
    }

    // Recalculate referral commission if USER referrer
    let referralCommission = existing.referralCommission
      ? Number(existing.referralCommission)
      : null;
    let netSellerAmount = grossSellerAmount;

    if (existing.referrerRole === Role.USER && existing.isFixedCommission) {
      const rate = Number(existing.referralCommissionRate);
      referralCommission = (grossSellerAmount * rate) / 100;
      netSellerAmount = grossSellerAmount - referralCommission;
    }

    return this.database.$transaction(async (tx) => {
      // Update OrderSettlement
      const updated = await tx.orderSettlement.update({
        where: { id },
        data: {
          productCost: new Prisma.Decimal(productCost),
          adminCommission: new Prisma.Decimal(adminCommission),
          grossSellerAmount: new Prisma.Decimal(grossSellerAmount),
          referralCommission: referralCommission
            ? new Prisma.Decimal(referralCommission)
            : null,
          netSellerAmount: new Prisma.Decimal(netSellerAmount),
          notes: dto.notes ?? existing.notes,
        },
        include: {
          settlements: true,
        },
      });

      // Update SELLER_PAYMENT Settlement amount
      await tx.settlement.updateMany({
        where: {
          orderSettlementId: id,
          settlementType: SettlementType.SELLER_PAYMENT,
        },
        data: {
          amount: new Prisma.Decimal(netSellerAmount),
        },
      });

      // Update REFERRAL_PAYMENT Settlement amount if exists
      if (referralCommission) {
        await tx.settlement.updateMany({
          where: {
            orderSettlementId: id,
            settlementType: SettlementType.REFERRAL_PAYMENT,
          },
          data: {
            amount: new Prisma.Decimal(referralCommission),
          },
        });
      }

      // Update ADMIN_COMMISSION Settlement amount
      await tx.settlement.updateMany({
        where: {
          orderSettlementId: id,
          settlementType: SettlementType.ADMIN_COMMISSION,
        },
        data: {
          amount: new Prisma.Decimal(adminCommission),
        },
      });

      return updated;
    });
  }

  /**
   * Delete OrderSettlement (Admin only)
   */
  async remove(id: number, adminId: number) {
    // Admin can view any settlement, so we pass admin role
    const existing = await this.findOne(id, adminId, Role.ADMIN);

    if (existing.status === OrderSettlementStatus.SETTLED) {
      throw new BadRequestException('Cannot delete settled settlement');
    }

    // Settlements will be cascade deleted
    await this.database.orderSettlement.delete({
      where: { id },
    });

    return { message: 'Settlement deleted successfully' };
  }

  /**
   * Get pending commissions for referral manager
   */
  async getPendingCommissions(referralManagerId: number) {
    const orderSettlements = await this.database.orderSettlement.findMany({
      where: {
        referrerId: referralManagerId,
        referrerRole: Role.REFERRAL_MANAGER,
        OR: [
          { status: OrderSettlementStatus.MANAGER_PENDING },
          { status: OrderSettlementStatus.PENDING },
        ],
      },
      include: {
        orderRequest: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orderSettlements.map((settlement) => ({
      id: settlement.id,
      orderId: `ORD-${settlement.orderRequestId}`,
      sellerName:
        `${settlement.orderRequest.user.firstName || ''} ${settlement.orderRequest.user.lastName || ''}`.trim() ||
        settlement.orderRequest.user.email,
      orderAmount: Number(settlement.totalAmount),
      grossSellerAmount: Number(settlement.grossSellerAmount),
      commissionRate: settlement.referralCommissionRate
        ? Number(settlement.referralCommissionRate)
        : null,
      commissionAmount: settlement.referralCommission
        ? Number(settlement.referralCommission)
        : null,
      settlementDate: settlement.createdAt.toISOString(),
      status:
        settlement.status === OrderSettlementStatus.MANAGER_PENDING
          ? 'PENDING'
          : 'SET',
    }));
  }

  /**
   * Set commission rate for referral manager
   */
  async setCommissionRate(
    orderSettlementId: number,
    commissionRate: number,
    referralManagerId: number,
    notes?: string,
  ) {
    // Validate commission rate
    if (commissionRate < 0 || commissionRate > 100) {
      throw new BadRequestException(
        'Commission rate must be between 0 and 100',
      );
    }

    const orderSettlement = await this.database.orderSettlement.findUnique({
      where: { id: orderSettlementId },
      include: {
        settlements: true,
      },
    });

    if (!orderSettlement) {
      throw new NotFoundException('Settlement not found');
    }

    // Verify this settlement belongs to the referral manager
    if (orderSettlement.referrerId !== referralManagerId) {
      throw new ForbiddenException(
        'You can only set commission rates for your own referrals',
      );
    }

    // Verify status is MANAGER_PENDING
    if (orderSettlement.status !== OrderSettlementStatus.MANAGER_PENDING) {
      // Allow updating if already set but not settled
      if (orderSettlement.status === OrderSettlementStatus.SETTLED) {
        throw new BadRequestException(
          'Cannot update commission rate for settled settlement',
        );
      }
    }

    const grossSellerAmount = Number(orderSettlement.grossSellerAmount);
    const referralCommission = (grossSellerAmount * commissionRate) / 100;
    const netSellerAmount = grossSellerAmount - referralCommission;

    return this.database.$transaction(async (tx) => {
      // Update OrderSettlement
      const updated = await tx.orderSettlement.update({
        where: { id: orderSettlementId },
        data: {
          referralCommissionRate: new Prisma.Decimal(commissionRate),
          referralCommission: new Prisma.Decimal(referralCommission),
          netSellerAmount: new Prisma.Decimal(netSellerAmount),
          status: OrderSettlementStatus.SETTLED,
          notes: notes
            ? `${orderSettlement.notes || ''}\nReferral Manager: ${notes}`.trim()
            : orderSettlement.notes,
        },
        include: {
          orderRequest: true,
        },
      });

      // Check if settlements already exist
      const existingSellerSettlement = orderSettlement.settlements.find(
        (s) => s.settlementType === SettlementType.SELLER_PAYMENT,
      );
      const existingReferralSettlement = orderSettlement.settlements.find(
        (s) => s.settlementType === SettlementType.REFERRAL_PAYMENT,
      );
      const existingAdminSettlement = orderSettlement.settlements.find(
        (s) => s.settlementType === SettlementType.ADMIN_COMMISSION,
      );

      if (existingSellerSettlement) {
        // Update existing SELLER_PAYMENT Settlement
        await tx.settlement.update({
          where: { id: existingSellerSettlement.id },
          data: {
            amount: new Prisma.Decimal(netSellerAmount),
          },
        });
      } else {
        // Create SELLER_PAYMENT Settlement (first time after manager sets rate)
        await tx.settlement.create({
          data: {
            orderSettlementId,
            userId: updated.orderRequest.userId,
            settlementType: SettlementType.SELLER_PAYMENT,
            amount: new Prisma.Decimal(netSellerAmount),
            status: SettlementStatus.PENDING,
          },
        });
      }

      if (existingReferralSettlement) {
        // Update existing REFERRAL_PAYMENT Settlement
        await tx.settlement.update({
          where: { id: existingReferralSettlement.id },
          data: {
            amount: new Prisma.Decimal(referralCommission),
          },
        });
      } else {
        // Create REFERRAL_PAYMENT Settlement (first time after manager sets rate)
        await tx.settlement.create({
          data: {
            orderSettlementId,
            userId: referralManagerId,
            settlementType: SettlementType.REFERRAL_PAYMENT,
            amount: new Prisma.Decimal(referralCommission),
            status: SettlementStatus.PENDING,
          },
        });
      }

      if (!existingAdminSettlement) {
        // Create ADMIN_COMMISSION Settlement if it doesn't exist
        await tx.settlement.create({
          data: {
            orderSettlementId,
            userId: orderSettlement.adminSettledBy!,
            settlementType: SettlementType.ADMIN_COMMISSION,
            amount: new Prisma.Decimal(orderSettlement.adminCommission),
            status: SettlementStatus.PAID,
            paidAt: new Date(),
          },
        });
      }

      return {
        message: 'Commission rate set successfully',
        orderSettlement: updated,
      };
    });
  }
}
