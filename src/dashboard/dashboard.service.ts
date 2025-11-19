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

    // Get pending settlement amount
    const pendingSettlementAmount = await this.getPendingSettlements(userId);

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
        pendingSettlementAmount: Number(pendingSettlementAmount.toFixed(2)),
      },
      trends: {
        ordersGrowth: Number(ordersGrowth.toFixed(1)),
        earningsGrowth: Number(earningsGrowth.toFixed(1)),
        completionRateChange: Number(completionRateChange.toFixed(1)),
      },
      payout: {
        canRequestPayout: this.isPayoutWindowActive(),
        nextPayoutDate: this.getNextPayoutDate(),
      },
    };
  }

  // Helper: Get pending settlements for user
  private async getPendingSettlements(userId: number): Promise<number> {
    const result = await this.prisma.settlement.aggregate({
      where: {
        userId,
        status: 'PENDING',
        settlementType: {
          in: ['SELLER_PAYMENT', 'REFERRAL_PAYMENT'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  // Helper: Check if current date is in payout window
  private isPayoutWindowActive(): boolean {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    // Mid-month window: 15-16
    if (day === 15 || day === 16) {
      return true;
    }

    // Month-end window: 30-31
    if (day === 30 || day === 31) {
      return true;
    }

    // First of month (for months with <31 days)
    if (day === 1) {
      const lastMonth = new Date(year, month - 1, 1);
      const daysInLastMonth = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0,
      ).getDate();
      return daysInLastMonth < 31;
    }

    return false;
  }

  // Helper: Get next available payout date
  private getNextPayoutDate(): string {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    // If currently in payout window, return current date
    if (this.isPayoutWindowActive()) {
      return now.toISOString();
    }

    // Determine next payout date
    let nextDate: Date;

    if (day < 15) {
      nextDate = new Date(year, month, 15);
    } else if (day >= 17 && day < 30) {
      nextDate = new Date(year, month, 30);
    } else {
      nextDate = new Date(year, month + 1, 15);
    }

    return nextDate.toISOString();
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

  // Admin Dashboard Stats
  async getAdminStats() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfTwoMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      1,
    );
    const endOfTwoMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      0,
      23,
      59,
      59,
    );

    // Parallel queries for better performance
    const [
      totalUsers,
      lastMonthUsers,
      twoMonthsAgoUsers,
      totalOrdersThisMonth,
      totalOrdersLastMonth,
      pendingOrders,
      ordersToday,
      lastMonthRevenue,
      twoMonthsAgoRevenue,
      lastMonthCommission,
      twoMonthsAgoCommission,
      pendingSettlements,
      activeSellers,
      deliveredOrders,
      totalOrders,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Last month users
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
      }),

      // Two months ago users (for growth calculation)
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfTwoMonthsAgo,
            lte: endOfTwoMonthsAgo,
          },
        },
      }),

      // Total orders this month
      this.prisma.orderRequest.count({
        where: {
          createdAt: {
            gte: startOfThisMonth,
          },
        },
      }),

      // Total orders last month
      this.prisma.orderRequest.count({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
      }),

      // Pending orders
      this.prisma.orderRequest.count({
        where: { status: 'PENDING' },
      }),

      // Orders today
      this.prisma.orderRequest.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // Last month revenue (DELIVERED orders)
      this.prisma.orderRequest.aggregate({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: { decidedPrice: true },
      }),

      // Two months ago revenue
      this.prisma.orderRequest.aggregate({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: startOfTwoMonthsAgo,
            lte: endOfTwoMonthsAgo,
          },
        },
        _sum: { decidedPrice: true },
      }),

      // Last month admin commission
      this.prisma.orderSettlement.aggregate({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: { adminCommission: true },
      }),

      // Two months ago admin commission
      this.prisma.orderSettlement.aggregate({
        where: {
          createdAt: {
            gte: startOfTwoMonthsAgo,
            lte: endOfTwoMonthsAgo,
          },
        },
        _sum: { adminCommission: true },
      }),

      // Pending settlements
      this.prisma.orderSettlement.count({
        where: { status: 'PENDING' },
      }),

      // Active sellers (users with role USER who have order requests)
      this.prisma.user.count({
        where: {
          role: 'USER',
          orderRequests: {
            some: {},
          },
        },
      }),

      // Delivered orders (for success rate)
      this.prisma.orderRequest.count({
        where: { status: 'DELIVERED' },
      }),

      // Total orders (for success rate)
      this.prisma.orderRequest.count(),
    ]);

    // Calculate metrics
    const totalRevenue = Number(lastMonthRevenue._sum.decidedPrice || 0);
    const twoMonthsRevenue = Number(twoMonthsAgoRevenue._sum.decidedPrice || 0);
    const adminCommission = Number(
      lastMonthCommission._sum.adminCommission || 0,
    );
    const twoMonthsCommission = Number(
      twoMonthsAgoCommission._sum.adminCommission || 0,
    );

    const usersGrowth = this.calculateGrowth(lastMonthUsers, twoMonthsAgoUsers);
    const ordersGrowth = this.calculateGrowth(
      totalOrdersThisMonth,
      totalOrdersLastMonth,
    );
    const revenueGrowth = this.calculateGrowth(totalRevenue, twoMonthsRevenue);
    const commissionGrowth = this.calculateGrowth(
      adminCommission,
      twoMonthsCommission,
    );
    const successRate =
      totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    return {
      totalUsers,
      lastMonthUsers,
      usersGrowth: Number(usersGrowth.toFixed(1)),
      totalOrders: totalOrdersThisMonth,
      pendingOrders,
      ordersToday,
      ordersGrowth: Number(ordersGrowth.toFixed(1)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      adminCommission: Number(adminCommission.toFixed(2)),
      revenueGrowth: Number(revenueGrowth.toFixed(1)),
      commissionGrowth: Number(commissionGrowth.toFixed(1)),
      pendingSettlements,
      activeSellers,
      successRate: Number(successRate.toFixed(1)),
    };
  }

  // Revenue Trend
  async getRevenueTrend(months: number = 12) {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - months + 1,
      1,
    );

    // Get all delivered orders from the start date
    const orders = await this.prisma.orderRequest.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: {
          gte: startDate,
        },
      },
      select: {
        decidedPrice: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    // Group by month and calculate revenue
    const monthlyRevenue = new Map<string, number>();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    orders.forEach((order) => {
      const date = new Date(order.updatedAt);
      const monthKey = monthNames[date.getMonth()];
      const currentRevenue = monthlyRevenue.get(monthKey) || 0;
      monthlyRevenue.set(monthKey, currentRevenue + Number(order.decidedPrice));
    });

    // Convert to array format
    const data = Array.from(monthlyRevenue.entries()).map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
    }));

    return { data };
  }

  // Orders by Status
  async getOrdersByStatus() {
    const statusColors = {
      PENDING: '#F59E0B',
      CONFIRMED: '#3B82F6',
      IN_PROGRESS: '#8B5CF6',
      DELIVERED: '#10B981',
      CANCELLED: '#EF4444',
      PAYMENT_PENDING: '#F97316',
      PARTIALLY_DELIVERED: '#14B8A6',
    };

    const statusLabels = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      IN_PROGRESS: 'In Progress',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      PAYMENT_PENDING: 'Payment Pending',
      PARTIALLY_DELIVERED: 'Partially Delivered',
    };

    // Get order counts by status
    const orderCounts = await this.prisma.orderRequest.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return {
      data: orderCounts.map((item) => ({
        label: statusLabels[item.status] || item.status,
        value: item._count.status,
        color: statusColors[item.status] || '#6B7280',
      })),
    };
  }
}
