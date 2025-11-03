import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { SettlementQueryDto } from './dto';
import { Prisma, SettlementStatus, SettlementType } from '@prisma/client';

@Injectable()
export class SettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, userRole: string, query: SettlementQueryDto) {
    const { status, settlementType, page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SettlementWhereInput = {};

    // Role-based filtering
    if (userRole === 'ADMIN') {
      // Admin can see all settlements
    } else {
      // USER and REFERRAL_MANAGER can see their own settlements + settlements of their referrals
      const referredUsers = await this.prisma.referral.findMany({
        where: { referrerId: userId },
        select: { refereeId: true },
      });

      const referredUserIds = referredUsers.map((r) => r.refereeId);

      where.userId = {
        in: [userId, ...referredUserIds],
      };
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Settlement type filter
    if (settlementType) {
      where.settlementType = settlementType;
    }

    // Search filter (by user name or order details)
    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [settlements, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  fullName: true,
                  accountNumber: true,
                  bankAccount: true,
                  whatsappNumber: true,
                },
              },
            },
          },
          orderSettlement: {
            include: {
              orderRequest: {
                select: {
                  id: true,
                  decidedPrice: true,
                  status: true,
                  createdAt: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
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
          },
        },
      }),
      this.prisma.settlement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format response with orderRequestId and user names
    const formattedSettlements = settlements.map((settlement) => ({
      ...settlement,
      orderRequestId: settlement.orderSettlement.orderRequest.id,
      userName:
        settlement.user.profile?.fullName ||
        `${settlement.user.firstName || ''} ${settlement.user.lastName || ''}`.trim() ||
        settlement.user.email,
      orderUserName:
        settlement.orderSettlement.orderRequest.user.profile?.fullName ||
        `${settlement.orderSettlement.orderRequest.user.firstName || ''} ${settlement.orderSettlement.orderRequest.user.lastName || ''}`.trim() ||
        settlement.orderSettlement.orderRequest.user.email,
    }));

    return {
      data: formattedSettlements,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  // async findOne(id: number, userId: number, userRole: string) {
  //   const settlement = await this.prisma.settlement.findUnique({
  //     where: { id },
  //     include: {
  //       user: {
  //         select: {
  //           id: true,
  //           firstName: true,
  //           lastName: true,
  //           email: true,
  //           role: true,
  //           profile: true,
  //         },
  //       },
  //       orderSettlement: {
  //         include: {
  //           orderRequest: {
  //             include: {
  //               user: {
  //                 select: {
  //                   id: true,
  //                   firstName: true,
  //                   lastName: true,
  //                   email: true,
  //                 },
  //               },
  //               product: true,
  //               customProduct: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!settlement) {
  //     return null;
  //   }

  //   // Role-based access control
  //   if (userRole === 'ADMIN') {
  //     return settlement;
  //   } else {
  //     // USER and REFERRAL_MANAGER can access own settlements or settlements of their referrals
  //     if (settlement.userId === userId) {
  //       return settlement;
  //     }

  //     const isReferredUser = await this.prisma.referral.findFirst({
  //       where: {
  //         referrerId: userId,
  //         refereeId: settlement.userId,
  //       },
  //     });

  //     if (isReferredUser) {
  //       return settlement;
  //     }

  //     return null;
  //   }
  // }

  async create(
    orderSettlementId: number,
    userId: number,
    settlementType: SettlementType,
    amount: number,
    notes?: string,
    paymentProof?: string,
  ) {
    return this.prisma.settlement.create({
      data: {
        orderSettlementId,
        userId,
        settlementType,
        amount,
        status: SettlementStatus.PENDING,
        notes,
        paymentProof,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                accountNumber: true,
                bankAccount: true,
              },
            },
          },
        },
        orderSettlement: {
          include: {
            orderRequest: {
              select: {
                id: true,
                decidedPrice: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: number,
    data: {
      amount?: number;
      status?: SettlementStatus;
      paidAt?: Date;
      paymentProof?: string;
      notes?: string;
    },
  ) {
    return this.prisma.settlement.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        orderSettlement: {
          include: {
            orderRequest: {
              select: {
                id: true,
                decidedPrice: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async getCommissionHistory(
    referralManagerId: number,
    query: SettlementQueryDto,
  ) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SettlementWhereInput = {
      userId: referralManagerId,
      settlementType: SettlementType.REFERRAL_PAYMENT,
    };

    // Status filter
    if (status) {
      where.status = status;
    }

    const [settlements, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderSettlement: {
            include: {
              orderRequest: {
                select: {
                  id: true,
                  decidedPrice: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
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
          },
        },
      }),
      this.prisma.settlement.count({ where }),
    ]);

    // Transform to commission history format
    const data = settlements.map((settlement) => {
      const orderSettlement = settlement.orderSettlement;
      const orderRequest = orderSettlement.orderRequest;
      const user = orderRequest.user;

      return {
        id: settlement.id,
        orderId: `ORD-${orderRequest.id}`,
        sellerName:
          user.profile?.fullName ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.email,
        orderAmount: Number(orderRequest.decidedPrice),
        commissionRate: orderSettlement.referralCommissionRate
          ? Number(orderSettlement.referralCommissionRate)
          : 0,
        commissionAmount: Number(settlement.amount),
        status:
          settlement.status === SettlementStatus.PAID
            ? 'PAID'
            : settlement.status === SettlementStatus.PENDING
              ? 'PENDING'
              : 'SET',
        setDate: orderSettlement.createdAt.toISOString(),
        paymentDate: settlement.paidAt ? settlement.paidAt.toISOString() : null,
        createdAt: settlement.createdAt.toISOString(),
      };
    });

    // Calculate stats
    const allSettlements = await this.prisma.settlement.findMany({
      where: {
        userId: referralManagerId,
        settlementType: SettlementType.REFERRAL_PAYMENT,
      },
      include: {
        orderSettlement: true,
      },
    });

    const totalCommission = allSettlements
      .filter((s) => s.status === SettlementStatus.PAID)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const rates = allSettlements
      .filter((s) => s.orderSettlement.referralCommissionRate)
      .map((s) => Number(s.orderSettlement.referralCommissionRate));

    const averageCommissionRate =
      rates.length > 0
        ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length
        : 0;

    const stats = {
      totalCommission,
      averageCommissionRate,
      topEarningPeriod: 'Current Month',
      topEarningAmount: totalCommission,
    };

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }
}
