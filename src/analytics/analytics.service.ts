import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { DateRange } from './dto/analytics-query.dto';
import {
  MetricsData,
  ChartsData,
  OverviewResponse,
  TopPerformersResponse,
  DateRangeResult,
  ChartDataPoint,
  DetailedReportsResponse,
  SellerDetail,
  ProductDetail,
  PaginationMeta,
} from './interfaces/analytics.interface';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Calculate date ranges based on selection
  private calculateDateRange(dateRange: DateRange): DateRangeResult {
    const endDate = new Date();
    const startDate = new Date();
    const previousEndDate = new Date();
    const previousStartDate = new Date();

    switch (dateRange) {
      case DateRange.SEVEN_DAYS:
        startDate.setDate(endDate.getDate() - 7);
        previousEndDate.setDate(startDate.getDate() - 1);
        previousStartDate.setDate(previousEndDate.getDate() - 7);
        break;
      case DateRange.THIRTY_DAYS:
        startDate.setDate(endDate.getDate() - 30);
        previousEndDate.setDate(startDate.getDate() - 1);
        previousStartDate.setDate(previousEndDate.getDate() - 30);
        break;
      case DateRange.NINETY_DAYS:
        startDate.setDate(endDate.getDate() - 90);
        previousEndDate.setDate(startDate.getDate() - 1);
        previousStartDate.setDate(previousEndDate.getDate() - 90);
        break;
      case DateRange.TWELVE_MONTHS:
        startDate.setMonth(endDate.getMonth() - 12);
        previousEndDate.setMonth(startDate.getMonth() - 1);
        previousStartDate.setMonth(previousEndDate.getMonth() - 12);
        break;
      case DateRange.ALL_TIME:
        startDate.setFullYear(2000, 0, 1);
        previousStartDate.setFullYear(2000, 0, 1);
        previousEndDate.setFullYear(2000, 0, 1);
        break;
    }

    return { startDate, endDate, previousStartDate, previousEndDate };
  }

  // Calculate growth percentage
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  // Get overview data (metrics + charts)
  async getOverview(dateRange: DateRange): Promise<OverviewResponse> {
    const { startDate, endDate, previousStartDate, previousEndDate } =
      this.calculateDateRange(dateRange);

    // Fetch metrics and charts in parallel
    const [metrics, charts] = await Promise.all([
      this.getMetrics(startDate, endDate, previousStartDate, previousEndDate),
      this.getCharts(startDate, endDate, dateRange),
    ]);

    return { metrics, charts };
  }

  // Get metrics data
  private async getMetrics(
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date,
  ): Promise<MetricsData> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    // Current period metrics
    const [currentRevenue, currentOrders, currentCommission, currentUsers] =
      await Promise.all([
        // Total Revenue
        this.prisma.orderRequest.aggregate({
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { decidedPrice: true },
        }),
        // Total Orders
        this.prisma.orderRequest.count({
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        // Platform Commission
        this.prisma.orderSettlement.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { adminCommission: true },
        }),
        // Active Users
        this.prisma.user.count({
          where: {
            orderRequests: {
              some: {
                status: { in: deliveredStatuses },
                createdAt: { gte: startDate, lte: endDate },
              },
            },
          },
        }),
      ]);

    // Previous period metrics
    const [previousRevenue, previousOrders, previousCommission, previousUsers] =
      await Promise.all([
        this.prisma.orderRequest.aggregate({
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
          _sum: { decidedPrice: true },
        }),
        this.prisma.orderRequest.count({
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
        }),
        this.prisma.orderSettlement.aggregate({
          where: {
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
          _sum: { adminCommission: true },
        }),
        this.prisma.user.count({
          where: {
            orderRequests: {
              some: {
                status: { in: deliveredStatuses },
                createdAt: { gte: previousStartDate, lte: previousEndDate },
              },
            },
          },
        }),
      ]);

    const totalRevenue = Number(currentRevenue._sum.decidedPrice || 0);
    const prevRevenue = Number(previousRevenue._sum.decidedPrice || 0);
    const totalOrders = currentOrders;
    const prevOrders = previousOrders;
    const platformCommission = Number(
      currentCommission._sum.adminCommission || 0,
    );
    const prevCommission = Number(previousCommission._sum.adminCommission || 0);
    const activeUsers = currentUsers;
    const prevUsers = previousUsers;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAvgOrderValue = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    return {
      totalRevenue,
      revenueGrowth: this.calculateGrowth(totalRevenue, prevRevenue),
      totalOrders,
      ordersGrowth: this.calculateGrowth(totalOrders, prevOrders),
      platformCommission,
      commissionGrowth: this.calculateGrowth(
        platformCommission,
        prevCommission,
      ),
      activeUsers,
      usersGrowth: this.calculateGrowth(activeUsers, prevUsers),
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      avgGrowth: this.calculateGrowth(avgOrderValue, prevAvgOrderValue),
    };
  }

  // Get charts data
  private async getCharts(
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartsData> {
    const [
      revenueOverTime,
      ordersByStatus,
      revenueByCategory,
      commissionOverTime,
      deliveredOrdersOverTime,
    ] = await Promise.all([
      this.getRevenueOverTime(startDate, endDate, dateRange),
      this.getOrdersByStatus(startDate, endDate),
      this.getRevenueByCategory(startDate, endDate),
      this.getCommissionOverTime(startDate, endDate, dateRange),
      this.getDeliveredOrdersOverTime(startDate, endDate, dateRange),
    ]);

    return {
      revenueOverTime,
      ordersByStatus,
      revenueByCategory,
      commissionOverTime,
      deliveredOrdersOverTime,
    };
  }

  // Revenue over time chart
  private async getRevenueOverTime(
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const orders = await this.prisma.orderRequest.findMany({
      where: {
        status: { in: deliveredStatuses },
        updatedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        decidedPrice: true,
        updatedAt: true,
      },
    });

    const formattedData = orders.map((o) => ({
      decidedPrice: o.decidedPrice,
      createdAt: o.updatedAt,
    }));

    return this.groupByPeriod(formattedData, dateRange);
  }

  // Group data by time period
  private groupByPeriod(
    orders: { decidedPrice: any; createdAt: Date }[],
    dateRange: DateRange,
  ): ChartDataPoint[] {
    const grouped = new Map<string, number>();

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      let key: string;

      if (dateRange === DateRange.TWELVE_MONTHS) {
        key = date.toLocaleString('default', {
          month: 'short',
          timeZone: 'Asia/Karachi',
        });
      } else if (dateRange === DateRange.ALL_TIME) {
        key = date.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Karachi',
        });
      } else if (dateRange === DateRange.NINETY_DAYS) {
        const weekNum = Math.floor(
          (date.getTime() - orders[0].createdAt.getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        );
        key = `Week ${weekNum + 1}`;
      } else {
        key = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Karachi',
        });
      }

      const current = grouped.get(key) || 0;
      grouped.set(key, current + Number(order.decidedPrice));
    });

    return Array.from(grouped.entries()).map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
    }));
  }

  // Orders by status chart
  private async getOrdersByStatus(
    startDate: Date,
    endDate: Date,
  ): Promise<ChartDataPoint[]> {
    const statusColors: Record<string, string> = {
      DELIVERED: '#10b981',
      IN_PROGRESS: '#3b82f6',
      PENDING: '#f59e0b',
      CANCELLED: '#ef4444',
      CONFIRMED: '#8b5cf6',
      PAYMENT_PENDING: '#ec4899',
      PARTIALLY_DELIVERED: '#06b6d4',
    };

    const statusLabels: Record<string, string> = {
      DELIVERED: 'Delivered',
      IN_PROGRESS: 'In Progress',
      PENDING: 'Pending',
      CANCELLED: 'Cancelled',
      CONFIRMED: 'Confirmed',
      PAYMENT_PENDING: 'Payment Pending',
      PARTIALLY_DELIVERED: 'Partially Delivered',
    };

    const ordersByStatus = await this.prisma.orderRequest.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    return ordersByStatus.map((item) => ({
      label: statusLabels[item.status] || item.status,
      value: item._count.id,
      color: statusColors[item.status] || '#6b7280',
    }));
  }

  // Revenue by category chart
  private async getRevenueByCategory(
    startDate: Date,
    endDate: Date,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const categoryColors = [
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#06b6d4',
    ];

    // Fetch all delivered orders (both regular and custom products)
    const orders = await this.prisma.orderRequest.findMany({
      where: {
        status: { in: deliveredStatuses },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        decidedPrice: true,
        isCustomProduct: true,
        product: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
        customProducts: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
      },
    });

    const grouped = new Map<string, number>();

    orders.forEach((order) => {
      let categoryName = 'Other';

      // For regular products, get category from product.category
      if (order.product?.category?.name) {
        categoryName = order.product.category.name;
      }
      // For custom products, get category from customProducts[0].category
      else if (order.isCustomProduct && order.customProducts?.[0]?.category?.name) {
        categoryName = order.customProducts[0].category.name;
      }

      const current = grouped.get(categoryName) || 0;
      grouped.set(categoryName, current + Number(order.decidedPrice));
    });

    return Array.from(grouped.entries())
      .map(([label, value], index) => ({
        label,
        value: Number(value.toFixed(2)),
        color: categoryColors[index % categoryColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }

  // Commission over time chart
  private async getCommissionOverTime(
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const settlements = await this.prisma.orderSettlement.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        adminCommission: true,
        createdAt: true,
      },
    });

    const formattedData = settlements.map((s) => ({
      decidedPrice: s.adminCommission,
      createdAt: s.createdAt,
    }));

    return this.groupByPeriod(formattedData, dateRange);
  }

  // Delivered orders over time chart
  private async getDeliveredOrdersOverTime(
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const orders = await this.prisma.orderRequest.findMany({
      where: {
        status: { in: deliveredStatuses },
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        updatedAt: true,
      },
    });

    // Map to format compatible with groupByPeriod
    // Treat 'decidedPrice' as 1 to count occurrences
    const formattedData = orders.map((o) => ({
      decidedPrice: 1,
      createdAt: o.updatedAt, // Use updatedAt as the date for grouping
    }));

    return this.groupByPeriod(formattedData, dateRange);
  }

  // Get top performers data
  async getTopPerformers(
    dateRange: DateRange,
    limit: number = 10,
  ): Promise<TopPerformersResponse> {
    const { startDate, endDate } = this.calculateDateRange(dateRange);

    const [
      topSellers,
      topProducts,
      topReferralManagers,
      referralManagerEarnings,
    ] = await Promise.all([
      this.getTopSellers(startDate, endDate, limit),
      this.getTopProducts(startDate, endDate, limit),
      this.getTopReferralManagers(startDate, endDate, limit),
      this.getReferralManagerEarnings(startDate, endDate, dateRange),
    ]);

    return {
      topSellers,
      topProducts,
      topReferralManagers,
      referralManagerEarnings,
    };
  }

  // Top sellers by revenue
  private async getTopSellers(
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const topSellers = await this.prisma.orderRequest.groupBy({
      by: ['userId'],
      where: {
        status: { in: deliveredStatuses },
        createdAt: { gte: startDate, lte: endDate },
        user: { role: { not: Role.ADMIN } },
      },
      _sum: { decidedPrice: true },
      orderBy: { _sum: { decidedPrice: 'desc' } },
      take: limit,
    });

    const userIds = topSellers.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: { select: { fullName: true } },
      },
    });

    return topSellers.map((seller) => {
      const user = users.find((u) => u.id === seller.userId);
      const name =
        user?.profile?.fullName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        'Unknown';

      return {
        label: name,
        value: Number(seller._sum.decidedPrice || 0),
      };
    });
  }

  // Top products by quantity sold
  private async getTopProducts(
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const topProducts = await this.prisma.orderRequest.groupBy({
      by: ['productId'],
      where: {
        status: { in: deliveredStatuses },
        createdAt: { gte: startDate, lte: endDate },
        productId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is number => id !== null);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true },
    });

    return topProducts
      .filter((item) => item.productId !== null)
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          label: product?.title || 'Unknown Product',
          value: item._count.id,
        };
      });
  }

  // Top referral managers by earnings
  private async getTopReferralManagers(
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<ChartDataPoint[]> {
    const topManagers = await this.prisma.settlement.groupBy({
      by: ['userId'],
      where: {
        settlementType: 'REFERRAL_PAYMENT',
        status: { in: ['PAID', 'PENDING'] },
        createdAt: { gte: startDate, lte: endDate },
        user: { role: Role.REFERRAL_MANAGER },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const managerIds = topManagers.map((m) => m.userId);
    const managers = await this.prisma.user.findMany({
      where: { id: { in: managerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: { select: { fullName: true } },
      },
    });

    return topManagers.map((manager) => {
      const user = managers.find((u) => u.id === manager.userId);
      const name =
        user?.profile?.fullName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        'Unknown';

      return {
        label: name,
        value: Number(manager._sum.amount || 0),
      };
    });
  }

  // Referral manager earnings over time
  private async getReferralManagerEarnings(
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const earnings = await this.prisma.settlement.findMany({
      where: {
        settlementType: 'REFERRAL_PAYMENT',
        status: { in: ['PAID', 'PENDING'] },
        createdAt: { gte: startDate, lte: endDate },
        user: { role: Role.REFERRAL_MANAGER },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    return this.groupByPeriod(
      earnings.map((e) => ({
        decidedPrice: e.amount,
        createdAt: e.createdAt,
      })),
      dateRange,
    );
  }

  // Get detailed reports with pagination
  async getDetailedReports(
    dateRange: DateRange,
    page: number = 1,
    limit: number = 10,
  ): Promise<DetailedReportsResponse> {
    const { startDate, endDate } = this.calculateDateRange(dateRange);

    const [topSellers, topProducts] = await Promise.all([
      this.getTopSellersDetailed(startDate, endDate, page, limit),
      this.getTopProductsDetailed(startDate, endDate, page, limit),
    ]);

    return { topSellers, topProducts };
  }

  // Top sellers detailed with pagination
  private async getTopSellersDetailed(
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number,
    sortBy: 'revenue' | 'orders' = 'revenue',
  ): Promise<{ data: SellerDetail[]; pagination: PaginationMeta }> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const skip = (page - 1) * limit;

    // Get total count
    const totalSellers = await this.prisma.user.count({
      where: {
        role: { not: Role.ADMIN },
        orderRequests: {
          some: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    // Get sellers with their orders and settlements
    const sellers = await this.prisma.user.findMany({
      where: {
        role: { not: Role.ADMIN },
        orderRequests: {
          some: {
        status: { in: deliveredStatuses },
        createdAt: { gte: startDate, lte: endDate },
          },
      },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profile: {
          select: { fullName: true },
        },
        orderRequests: {
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
          select: {
            decidedPrice: true,
          },
        },
        settlements: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          select: {
            amount: true,
          },
        },
      },
      skip,
      take: limit,
    });

    // Format data
    const data = sellers.map((seller) => {
      const orders = seller.orderRequests.length;
      const revenue = seller.orderRequests.reduce(
        (sum, order) => sum + Number(order.decidedPrice),
        0,
      );
      const commission = seller.settlements.reduce(
        (sum, settlement) => sum + Number(settlement.amount),
        0,
      );

      return {
        id: seller.id,
        name:
          seller.profile?.fullName ||
          `${seller.firstName || ''} ${seller.lastName || ''}`.trim() ||
          'Unknown',
        email: seller.email,
        orders,
        revenue: Number(revenue.toFixed(2)),
        commission: Number(commission.toFixed(2)),
      };
    });

    // Sort by revenue descending
    data.sort((a, b) => b.revenue - a.revenue);

    return {
      data,
      pagination: {
        total: totalSellers,
        page,
        limit,
        totalPages: Math.ceil(totalSellers / limit),
      },
    };
  }

  // Top products detailed with pagination
  private async getTopProductsDetailed(
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number,
  ): Promise<{ data: ProductDetail[]; pagination: PaginationMeta }> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const skip = (page - 1) * limit;

    // Get total count
    const totalProducts = await this.prisma.product.count({
      where: {
        orderRequests: {
          some: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    // Get products with their orders
    const products = await this.prisma.product.findMany({
      where: {
        orderRequests: {
          some: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
      select: {
        id: true,
        title: true,
        category: {
          select: { name: true },
        },
        orderRequests: {
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
          select: {
            decidedPrice: true,
          },
        },
      },
      skip,
      take: limit,
    });

    // Format data
    const data = products.map((product) => {
      const sold = product.orderRequests.length;
      const revenue = product.orderRequests.reduce(
        (sum, order) => sum + Number(order.decidedPrice),
        0,
      );
      const avgPrice = sold > 0 ? revenue / sold : 0;

      return {
        id: product.id,
        name: product.title,
        category: product.category.name,
        sold,
        revenue: Number(revenue.toFixed(2)),
        avgPrice: Number(avgPrice.toFixed(2)),
      };
    });

    // Sort by sold quantity descending
    data.sort((a, b) => b.sold - a.sold);

    return {
      data,
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages: Math.ceil(totalProducts / limit),
      },
    };
  }

  // ============== USER-SPECIFIC ANALYTICS ==============

  // Get user overview based on role
  async getUserOverview(userId: number, dateRange: DateRange): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === Role.REFERRAL_MANAGER) {
      return this.getReferralManagerOverview(userId, dateRange);
    } else {
      return this.getSellerOverview(userId, dateRange);
    }
  }

  // Get referral manager overview
  private async getReferralManagerOverview(
    userId: number,
    dateRange: DateRange,
  ): Promise<any> {
    const { startDate, endDate } = this.calculateDateRange(dateRange);

    // Current period metrics
    const [
      managerEarnings,
      referralEarnings,
      activeReferrals,
      currentCommission,
    ] = await Promise.all([
      // Manager earnings from settlements (SELLER_PAYMENT)
      this.prisma.settlement.aggregate({
        where: {
          userId,
          settlementType: 'SELLER_PAYMENT',
          status: { in: ['PAID', 'PENDING'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Referral earnings from settlements (REFERRAL_PAYMENT)
      this.prisma.settlement.aggregate({
        where: {
          userId,
          settlementType: 'REFERRAL_PAYMENT',
          status: { in: ['PAID', 'PENDING'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Active referrals count
      this.prisma.profile.count({
        where: {
          referredBy: userId,
          verified: true,
        },
      }),
      // Total commission from order settlements
      this.prisma.orderSettlement.aggregate({
        where: {
          referrerId: userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { referralCommission: true },
      }),
    ]);

    const managerEarningsAmount = Number(managerEarnings._sum.amount || 0);
    const referralEarningsAmount = Number(referralEarnings._sum.amount || 0);
    const totalEarnings = managerEarningsAmount + referralEarningsAmount;
    const totalCommission = Number(
      currentCommission._sum.referralCommission || 0,
    );
    const avgCommissionPerReferral =
      activeReferrals > 0 ? totalCommission / activeReferrals : 0;

    // Get charts data
    const [earningsOverTime, referralStatus, topReferredSellers] =
      await Promise.all([
        this.getReferralManagerCombinedEarningsOverTime(
          userId,
          startDate,
          endDate,
          dateRange,
        ),
        this.getReferralStatusDistribution(userId),
        this.getTopReferredSellers(userId, startDate, endDate, 5),
      ]);

    return {
      metrics: {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        activeReferrals,
        totalCommission: Number(totalCommission.toFixed(2)),
        avgCommissionPerReferral: Number(avgCommissionPerReferral.toFixed(2)),
        referralEarnings: Number(referralEarningsAmount.toFixed(2)),
      },
      charts: {
        earningsOverTime,
        referralStatus,
        topReferredSellers,
      },
    };
  }

  // Get seller overview
  private async getSellerOverview(
    userId: number,
    dateRange: DateRange,
  ): Promise<any> {
    const { startDate, endDate, previousStartDate, previousEndDate } =
      this.calculateDateRange(dateRange);

    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    // Current period metrics
    const [
      currentRevenue,
      currentOrders,
      completedOrders,
      sellerEarnings,
      referralEarnings,
    ] = await Promise.all([
      // Total revenue
      this.prisma.orderRequest.aggregate({
        where: {
          userId,
          status: { in: deliveredStatuses },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { decidedPrice: true },
      }),
      // Total orders
      this.prisma.orderRequest.count({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Completed orders
      this.prisma.orderRequest.count({
        where: {
          userId,
          status: { in: deliveredStatuses },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Seller earnings from settlements (SELLER_PAYMENT)
      this.prisma.settlement.aggregate({
        where: {
          userId,
          settlementType: 'SELLER_PAYMENT',
          status: { in: ['PAID', 'PENDING'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Referral earnings from settlements (REFERRAL_PAYMENT)
      this.prisma.settlement.aggregate({
        where: {
          userId,
          settlementType: 'REFERRAL_PAYMENT',
          status: { in: ['PAID', 'PENDING'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
    ]);

    // Previous period metrics (only for earnings growth)
    const [previousSellerEarnings, previousReferralEarnings] =
      await Promise.all([
        this.prisma.settlement.aggregate({
          where: {
            userId,
            settlementType: 'SELLER_PAYMENT',
            status: { in: ['PAID', 'PENDING'] },
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
          _sum: { amount: true },
        }),
        this.prisma.settlement.aggregate({
          where: {
            userId,
            settlementType: 'REFERRAL_PAYMENT',
            status: { in: ['PAID', 'PENDING'] },
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
          _sum: { amount: true },
        }),
      ]);

    const totalRevenue = Number(currentRevenue._sum.decidedPrice || 0);
    const totalOrders = currentOrders;
    const avgOrderValue =
      completedOrders > 0 ? totalRevenue / completedOrders : 0;

    const userSellerEarnings = Number(sellerEarnings._sum.amount || 0);
    const prevSellerEarnings = Number(previousSellerEarnings._sum.amount || 0);
    const userReferralEarnings = Number(referralEarnings._sum.amount || 0);
    const prevReferralEarnings = Number(
      previousReferralEarnings._sum.amount || 0,
    );

    // Get charts data
    const [revenueOverTime, ordersByStatus, topProducts] = await Promise.all([
      this.getSellerSettlementsOverTime(userId, startDate, endDate, dateRange),
      this.getSellerOrdersByStatus(userId, startDate, endDate),
      this.getSellerTopProducts(userId, startDate, endDate, 5),
    ]);

    return {
      metrics: {
        totalRevenue,
        totalOrders,
        completedOrders,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        sellerEarnings: Number(userSellerEarnings.toFixed(2)),
        sellerEarningsGrowth: this.calculateGrowth(
          userSellerEarnings,
          prevSellerEarnings,
        ),
        referralEarnings: Number(userReferralEarnings.toFixed(2)),
        referralEarningsGrowth: this.calculateGrowth(
          userReferralEarnings,
          prevReferralEarnings,
        ),
      },
      charts: {
        revenueOverTime,
        ordersByStatus,
        topProducts,
      },
    };
  }

  // Referral manager earnings over time
  private async getReferralManagerEarningsOverTime(
    userId: number,
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const earnings = await this.prisma.settlement.findMany({
      where: {
        userId,
        settlementType: 'REFERRAL_PAYMENT',
        status: { in: ['PAID', 'PENDING'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    return this.groupByPeriod(
      earnings.map((e) => ({
        decidedPrice: e.amount,
        createdAt: e.createdAt,
      })),
      dateRange,
    );
  }

  // Referral manager combined earnings over time (manager + referral)
  private async getReferralManagerCombinedEarningsOverTime(
    userId: number,
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const earnings = await this.prisma.settlement.findMany({
      where: {
        userId,
        settlementType: { in: ['SELLER_PAYMENT', 'REFERRAL_PAYMENT'] },
        status: { in: ['PAID', 'PENDING'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    return this.groupByPeriod(
      earnings.map((e) => ({
        decidedPrice: e.amount,
        createdAt: e.createdAt,
      })),
      dateRange,
    );
  }

  // Referral status distribution
  private async getReferralStatusDistribution(
    userId: number,
  ): Promise<ChartDataPoint[]> {
    const [active, inactive] = await Promise.all([
      this.prisma.profile.count({
        where: { referredBy: userId, verified: true },
      }),
      this.prisma.profile.count({
        where: { referredBy: userId, verified: false },
      }),
    ]);

    return [
      { label: 'Active', value: active, color: '#10b981' },
      { label: 'Inactive', value: inactive, color: '#ef4444' },
    ];
  }

  // Top referred sellers
  private async getTopReferredSellers(
    userId: number,
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    // Get referred users
    const referredProfiles = await this.prisma.profile.findMany({
      where: { referredBy: userId },
      select: { userId: true },
    });

    const referredUserIds = referredProfiles.map((p) => p.userId);

    if (referredUserIds.length === 0) {
      return [];
    }

    // Get their order totals
    const topSellers = await this.prisma.orderRequest.groupBy({
      by: ['userId'],
      where: {
        userId: { in: referredUserIds },
        status: { in: deliveredStatuses },
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { decidedPrice: true },
      orderBy: { _sum: { decidedPrice: 'desc' } },
      take: limit,
    });

    const userIds = topSellers.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: { select: { fullName: true } },
      },
    });

    return topSellers.map((seller) => {
      const user = users.find((u) => u.id === seller.userId);
      const name =
        user?.profile?.fullName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        'Unknown';

      return {
        label: name,
        value: Number(seller._sum.decidedPrice || 0),
      };
    });
  }

  // Seller revenue over time
  private async getSellerRevenueOverTime(
    userId: number,
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const orders = await this.prisma.orderRequest.findMany({
      where: {
        userId,
        status: { in: deliveredStatuses },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        decidedPrice: true,
        createdAt: true,
      },
    });

    return this.groupByPeriod(orders, dateRange);
  }

  // Seller settlements over time (month-wise)
  private async getSellerSettlementsOverTime(
    userId: number,
    startDate: Date,
    endDate: Date,
    dateRange: DateRange,
  ): Promise<ChartDataPoint[]> {
    const settlements = await this.prisma.settlement.findMany({
      where: {
        userId,
        settlementType: { in: ['SELLER_PAYMENT', 'REFERRAL_PAYMENT'] },
        status: { in: ['PAID', 'PENDING'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    return this.groupByPeriod(
      settlements.map((s) => ({
        decidedPrice: s.amount,
        createdAt: s.createdAt,
      })),
      dateRange,
    );
  }

  // Seller orders by status
  private async getSellerOrdersByStatus(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ChartDataPoint[]> {
    const statusColors: Record<string, string> = {
      DELIVERED: '#10b981',
      IN_PROGRESS: '#3b82f6',
      PENDING: '#f59e0b',
      CANCELLED: '#ef4444',
      CONFIRMED: '#8b5cf6',
      PAYMENT_PENDING: '#ec4899',
      PARTIALLY_DELIVERED: '#06b6d4',
    };

    const statusLabels: Record<string, string> = {
      DELIVERED: 'Delivered',
      IN_PROGRESS: 'In Progress',
      PENDING: 'Pending',
      CANCELLED: 'Cancelled',
      CONFIRMED: 'Confirmed',
      PAYMENT_PENDING: 'Payment Pending',
      PARTIALLY_DELIVERED: 'Partially Delivered',
    };

    const ordersByStatus = await this.prisma.orderRequest.groupBy({
      by: ['status'],
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    return ordersByStatus.map((item) => ({
      label: statusLabels[item.status] || item.status,
      value: item._count.id,
      color: statusColors[item.status] || '#6b7280',
    }));
  }

  // Seller top products
  private async getSellerTopProducts(
    userId: number,
    startDate: Date,
    endDate: Date,
    limit: number,
  ): Promise<ChartDataPoint[]> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const topProducts = await this.prisma.orderRequest.groupBy({
      by: ['productId'],
      where: {
        userId,
        status: { in: deliveredStatuses },
        createdAt: { gte: startDate, lte: endDate },
        productId: { not: null },
      },
      _sum: { decidedPrice: true },
      orderBy: { _sum: { decidedPrice: 'desc' } },
      take: limit,
    });

    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is number => id !== null);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true },
    });

    return topProducts
      .filter((item) => item.productId !== null)
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          label: product?.title || 'Unknown Product',
          value: Number(item._sum.decidedPrice || 0),
        };
      });
  }

  // Get user performance details
  async getUserPerformance(
    userId: number,
    dateRange: DateRange,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { startDate, endDate } = this.calculateDateRange(dateRange);

    if (user.role === Role.REFERRAL_MANAGER) {
      return this.getReferralManagerPerformance(
        userId,
        startDate,
        endDate,
        page,
        limit,
      );
    } else {
      return this.getSellerPerformance(userId, startDate, endDate, page, limit);
    }
  }

  // Referral manager performance details
  private async getReferralManagerPerformance(
    userId: number,
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number,
  ): Promise<any> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const skip = (page - 1) * limit;

    // Get referred users
    const referredProfiles = await this.prisma.profile.findMany({
      where: { referredBy: userId },
      select: { userId: true },
    });

    const referredUserIds = referredProfiles.map((p) => p.userId);

    if (referredUserIds.length === 0) {
      return {
        topReferredSellers: {
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        },
      };
    }

    // Get total count
    const totalSellers = referredUserIds.length;

    // Get sellers with their orders
    const sellers = await this.prisma.user.findMany({
      where: {
        id: { in: referredUserIds },
        orderRequests: {
          some: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profile: {
          select: { fullName: true },
        },
        orderRequests: {
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
          select: {
            decidedPrice: true,
            orderSettlements: {
              where: { referrerId: userId },
              select: {
                referralCommission: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
    });

    // Format data
    const data = sellers.map((seller) => {
      const orders = seller.orderRequests.length;
      const revenue = seller.orderRequests.reduce(
        (sum, order) => sum + Number(order.decidedPrice),
        0,
      );
      const commission = seller.orderRequests.reduce(
        (sum, order) =>
          sum + Number(order.orderSettlements[0]?.referralCommission || 0),
        0,
      );

      return {
        id: seller.id,
        name:
          seller.profile?.fullName ||
          `${seller.firstName || ''} ${seller.lastName || ''}`.trim() ||
          'Unknown',
        email: seller.email,
        orders,
        revenue: Number(revenue.toFixed(2)),
        commission: Number(commission.toFixed(2)),
      };
    });

    // Sort by revenue descending
    data.sort((a, b) => b.revenue - a.revenue);

    return {
      topReferredSellers: {
        data,
        pagination: {
          total: totalSellers,
          page,
          limit,
          totalPages: Math.ceil(totalSellers / limit),
        },
      },
    };
  }

  // Seller performance details
  private async getSellerPerformance(
    userId: number,
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number,
  ): Promise<any> {
    const deliveredStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.PARTIALLY_DELIVERED,
    ];

    const skip = (page - 1) * limit;

    // Get total count
    const totalProducts = await this.prisma.product.count({
      where: {
        ownerId: userId,
        orderRequests: {
          some: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    // Get products with their orders
    const products = await this.prisma.product.findMany({
      where: {
        ownerId: userId,
        orderRequests: {
          some: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
      select: {
        id: true,
        title: true,
        category: {
          select: { name: true },
        },
        orderRequests: {
          where: {
            status: { in: deliveredStatuses },
            createdAt: { gte: startDate, lte: endDate },
          },
          select: {
            decidedPrice: true,
          },
        },
      },
      skip,
      take: limit,
    });

    // Format data
    const data = products.map((product) => {
      const sold = product.orderRequests.length;
      const revenue = product.orderRequests.reduce(
        (sum, order) => sum + Number(order.decidedPrice),
        0,
      );
      const avgPrice = sold > 0 ? revenue / sold : 0;

      return {
        id: product.id,
        name: product.title,
        category: product.category.name,
        sold,
        revenue: Number(revenue.toFixed(2)),
        avgPrice: Number(avgPrice.toFixed(2)),
      };
    });

    // Sort by sold quantity descending
    data.sort((a, b) => b.sold - a.sold);

    return {
      topProducts: {
        data,
        pagination: {
          total: totalProducts,
          page,
          limit,
          totalPages: Math.ceil(totalProducts / limit),
        },
      },
    };
  }
}
