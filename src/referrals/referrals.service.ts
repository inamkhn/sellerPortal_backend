import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { ReferralQueryDto, ReferralSortBy } from './dto';
import { Prisma, SettlementType } from '@prisma/client';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, query: ReferralQueryDto) {
    const {
      search,
      status,
      sortBy = ReferralSortBy.COMMISSION,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    // Get all users referred by current user
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      select: { refereeId: true },
    });

    const referredUserIds = referrals.map((r) => r.refereeId);

    if (referredUserIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        stats: {
          totalReferrals: 0,
          activeReferrals: 0,
          totalOrders: 0,
          totalCommission: 0,
        },
      };
    }

    // Build where clause
    const where: Prisma.UserWhereInput = {
      id: { in: referredUserIds },
    };

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Get users with aggregated data
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            whatsappNumber: true,
            referralCode: true,
          },
        },
        orderRequests: {
          select: {
            id: true,
            decidedPrice: true,
            status: true,
          },
        },
        settlements: {
          where: {
            settlementType: SettlementType.REFERRAL_PAYMENT,
            orderSettlement: {
              referrerId: userId,
            },
          },
          select: {
            amount: true,
          },
        },
      },
    });

    // Transform and calculate stats
    const data = users.map((user) => {
      const totalOrders = user.orderRequests.length;
      const totalOrderValue = user.orderRequests.reduce(
        (sum, order) => sum + Number(order.decidedPrice),
        0,
      );
      const commissionEarned = user.settlements.reduce(
        (sum, settlement) => sum + Number(settlement.amount),
        0,
      );
      const isActive = totalOrders > 0;

      return {
        id: user.id,
        name:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        phone: user.profile?.whatsappNumber || null,
        joinDate: user.createdAt.toISOString(),
        totalOrders,
        totalOrderValue,
        commissionEarned,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        referralCode: user.profile?.referralCode || '',
      };
    });

    // Filter by status if provided
    let filteredData = data;
    if (status) {
      filteredData = data.filter((item) => item.status === status.toString());
    }

    // Sort data
    if (sortBy === ReferralSortBy.COMMISSION) {
      filteredData.sort((a, b) => b.commissionEarned - a.commissionEarned);
    } else if (sortBy === ReferralSortBy.ORDERS) {
      filteredData.sort((a, b) => b.totalOrders - a.totalOrders);
    } else if (sortBy === ReferralSortBy.DATE) {
      filteredData.sort(
        (a, b) =>
          new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime(),
      );
    }

    // Calculate total count
    const total = await this.prisma.user.count({ where });

    // Calculate stats
    const stats = {
      totalReferrals: data.length,
      activeReferrals: data.filter((item) => item.status === 'ACTIVE').length,
      totalOrders: data.reduce((sum, item) => sum + item.totalOrders, 0),
      totalCommission: data.reduce(
        (sum, item) => sum + item.commissionEarned,
        0,
      ),
    };

    return {
      data: filteredData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  async findOne(userId: number, referralId: number) {
    // Verify that the referral belongs to the current user
    const referral = await this.prisma.referral.findFirst({
      where: {
        referrerId: userId,
        refereeId: referralId,
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: referralId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            whatsappNumber: true,
            referralCode: true,
          },
        },
        orderRequests: {
          select: {
            id: true,
            decidedPrice: true,
            status: true,
            createdAt: true,
            orderSettlements: {
              where: {
                referrerId: userId,
              },
              select: {
                settlements: {
                  where: {
                    userId: userId,
                    settlementType: SettlementType.REFERRAL_PAYMENT,
                  },
                  select: {
                    amount: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate stats
    const totalOrders = user.orderRequests.length;
    const completedOrders = user.orderRequests.filter(
      (order) => order.status === 'DELIVERED',
    ).length;
    const totalOrderValue = user.orderRequests.reduce(
      (sum, order) => sum + Number(order.decidedPrice),
      0,
    );

    // Calculate total commission
    let totalCommission = 0;
    const orders = user.orderRequests.map((order) => {
      const commission =
        order.orderSettlements[0]?.settlements.reduce(
          (sum, settlement) => sum + Number(settlement.amount),
          0,
        ) || 0;
      totalCommission += commission;

      return {
        id: `ORD-${order.id}`,
        orderDate: order.createdAt.toISOString(),
        amount: Number(order.decidedPrice),
        status: order.status,
        commission,
      };
    });

    return {
      id: user.id,
      name:
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      phone: user.profile?.whatsappNumber || null,
      joinDate: user.createdAt.toISOString(),
      totalOrders,
      completedOrders,
      totalOrderValue,
      totalSalesValue: totalOrderValue,
      commissionEarned: totalCommission,
      totalCommission,
      status: totalOrders > 0 ? 'ACTIVE' : 'INACTIVE',
      referralCode: user.profile?.referralCode || '',
      orders,
    };
  }
}
