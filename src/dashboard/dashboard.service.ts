import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    userId: number,
    userRole: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Build date filter
    const dateFilter: Prisma.OrderRequestWhereInput = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate);
      }
    }

    // Build user filter based on role
    const userFilter = await this.buildUserFilter(userId, userRole);

    // Combine filters
    const whereClause: Prisma.OrderRequestWhereInput = {
      ...userFilter,
      ...dateFilter,
    };

    // Get current period stats
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      earningsData,
      ordersThisWeek,
      thisMonthEarningsData,
    ] = await Promise.all([
      // Total orders
      this.prisma.orderRequest.count({ where: whereClause }),

      // Pending orders
      this.prisma.orderRequest.count({
        where: { ...whereClause, status: 'PENDING' },
      }),

      // Completed orders (DELIVERED + PARTIALLY_DELIVERED)
      this.prisma.orderRequest.count({
        where: {
          ...whereClause,
          status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
        },
      }),

      // Cancelled orders
      this.prisma.orderRequest.count({
        where: { ...whereClause, status: 'CANCELLED' },
      }),

      // Total earnings from settlements
      this.getEarnings(userId, userRole, dateFilter),

      // Orders this week
      this.prisma.orderRequest.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: this.getStartOfWeek(),
          },
        },
      }),

      // This month earnings
      this.getEarnings(userId, userRole, {
        createdAt: {
          gte: this.getStartOfMonth(),
        },
      }),
    ]);

    // Calculate previous period for trends
    const previousPeriodFilter = this.getPreviousPeriodFilter(
      startDate,
      endDate,
    );
    const previousWhereClause: Prisma.OrderRequestWhereInput = {
      ...userFilter,
      ...previousPeriodFilter,
    };

    const [previousTotalOrders, previousEarningsData, previousCompletedOrders] =
      await Promise.all([
        this.prisma.orderRequest.count({ where: previousWhereClause }),
        this.getEarnings(userId, userRole, previousPeriodFilter),
        this.prisma.orderRequest.count({
          where: {
            ...previousWhereClause,
            status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
          },
        }),
      ]);

    // Calculate metrics
    const totalEarnings = earningsData.totalEarnings;
    const averageOrderValue = earningsData.averageOrderValue;
    const successRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Calculate trends
    const ordersGrowth = this.calculateGrowth(totalOrders, previousTotalOrders);
    const earningsGrowth = this.calculateGrowth(
      totalEarnings,
      previousEarningsData.totalEarnings,
    );

    const previousSuccessRate =
      previousTotalOrders > 0
        ? (previousCompletedOrders / previousTotalOrders) * 100
        : 0;
    const completionRateChange = successRate - previousSuccessRate;

    return {
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        thisMonthEarnings: Number(
          thisMonthEarningsData.totalEarnings.toFixed(2),
        ),
        ordersThisWeek,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        successRate: Number(successRate.toFixed(1)),
      },
      trends: {
        ordersGrowth: Number(ordersGrowth.toFixed(1)),
        earningsGrowth: Number(earningsGrowth.toFixed(1)),
        completionRateChange: Number(completionRateChange.toFixed(1)),
      },
    };
  }

  // Helper: Build user filter based on role
  private async buildUserFilter(
    userId: number,
    userRole: string,
  ): Promise<Prisma.OrderRequestWhereInput> {
    if (userRole === 'ADMIN') {
      // Admin sees all orders
      return {};
    } else if (userRole === 'REFERRAL_MANAGER') {
      // Referral manager sees own orders + referred users' orders
      const referredUsers = await this.prisma.referral.findMany({
        where: { referrerId: userId },
        select: { refereeId: true },
      });

      const referredUserIds = referredUsers.map((r) => r.refereeId);

      return {
        userId: {
          in: [userId, ...referredUserIds],
        },
      };
    } else {
      // Regular user sees only their orders
      return { userId };
    }
  }

  // Helper: Get start of current week
  private getStartOfWeek(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    return new Date(now.setDate(diff));
  }

  // Helper: Get start of current month
  private getStartOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Helper: Calculate previous period filter
  private getPreviousPeriodFilter(
    startDate?: string,
    endDate?: string,
  ): Prisma.OrderRequestWhereInput {
    if (!startDate && !endDate) {
      // Default: compare with previous month
      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      return {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      };
    }

    // Calculate period length and shift back
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    const periodLength = end.getTime() - start.getTime();

    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = new Date(start.getTime() - 1);

    return {
      createdAt: {
        gte: previousStart,
        lte: previousEnd,
      },
    };
  }

  // Helper: Calculate growth percentage
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Helper: Get earnings from settlements based on user role
  private async getEarnings(
    userId: number,
    userRole: string,
    dateFilter: Prisma.OrderRequestWhereInput,
  ): Promise<{ totalEarnings: number; averageOrderValue: number }> {
    const settlementFilter: Prisma.SettlementWhereInput = {
      status: 'PAID', // Only count paid settlements
    };

    // Add date filter if provided (convert OrderRequest filter to Settlement filter)
    if (dateFilter.createdAt) {
      const createdAt = dateFilter.createdAt;
      if (typeof createdAt === 'object' && 'gte' in createdAt) {
        settlementFilter.createdAt = {
          gte: createdAt.gte as Date,
          lte: createdAt.lte as Date | undefined,
        };
      }
    }

    // Role-based filtering
    if (userRole === 'ADMIN') {
      // Admin sees total admin commission
      settlementFilter.settlementType = 'ADMIN_COMMISSION';
    } else {
      // Regular USER and REFERRAL_MANAGER see their seller payments + referral payments
      // REFERRAL_MANAGER is treated as a seller who can also earn from referrals
      settlementFilter.userId = userId;
      settlementFilter.settlementType = {
        in: ['SELLER_PAYMENT', 'REFERRAL_PAYMENT'],
      };
    }

    // Get total earnings and count
    const [earningsAggregate, settlementsCount] = await Promise.all([
      this.prisma.settlement.aggregate({
        where: settlementFilter,
        _sum: { amount: true },
      }),
      this.prisma.settlement.count({
        where: settlementFilter,
      }),
    ]);

    const totalEarnings = Number(earningsAggregate._sum.amount || 0);
    const averageOrderValue =
      settlementsCount > 0 ? totalEarnings / settlementsCount : 0;

    return {
      totalEarnings,
      averageOrderValue,
    };
  }
}
