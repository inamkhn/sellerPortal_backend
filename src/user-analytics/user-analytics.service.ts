import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import {
  UserAnalyticsData,
  ReferralStats,
  MonthlyEarnings,
  CategorySales,
  RecentOrder,
} from './interfaces/user-analytics.interface';

@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async calculateUserAnalytics(userId: number): Promise<UserAnalyticsData> {
    const startTime = Date.now();
    this.logger.debug(`Starting analytics calculation for user ${userId}`);

    try {
      const [
        totalEarnings,
        totalProducts,
        totalOrders,
        referralStats,
        monthlyEarnings,
        categorySales,
        recentOrders,
      ] = await Promise.all([
        this.calculateTotalEarnings(userId),
        this.countUserProducts(userId),
        this.countUserOrders(userId),
        this.calculateReferralStats(userId),
        this.calculateMonthlyEarnings(userId),
        this.calculateCategorySales(userId),
        this.getRecentOrders(userId),
      ]);

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Analytics calculation completed for user ${userId} in ${executionTime}ms`,
      );

      if (executionTime > 1000) {
        this.logger.warn(
          `Slow analytics calculation for user ${userId}: ${executionTime}ms`,
        );
      }

      return {
        totalEarnings,
        totalProducts,
        totalOrders,
        referralStats,
        monthlyEarnings,
        categorySales,
        recentOrders,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Analytics calculation failed for user ${userId} after ${executionTime}ms`,
        error,
      );
      throw error;
    }
  }

  private async calculateTotalEarnings(userId: number): Promise<number> {
    // Calculate earnings from user's own sales (user_share)
    // Uses index on (userId, status) for optimal performance
    const userEarnings = await this.prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
      },
      _sum: {
        userShare: true,
      },
    });

    // Calculate earnings from referrals (referrer_share)
    // Uses index on (referrerId, status) for optimal performance
    const referrerEarnings = await this.prisma.payment.aggregate({
      where: {
        referrerId: userId,
        status: 'PAID',
      },
      _sum: {
        referrerShare: true,
      },
    });

    const userShareTotal = userEarnings._sum.userShare || 0;
    const referrerShareTotal = referrerEarnings._sum.referrerShare || 0;

    // Convert Decimal to number for response
    return Number(userShareTotal) + Number(referrerShareTotal);
  }

  private async countUserProducts(userId: number): Promise<number> {
    const productCount = await this.prisma.product.count({
      where: {
        ownerId: userId,
      },
    });

    return productCount;
  }

  private async countUserOrders(userId: number): Promise<number> {
    const orderCount = await this.prisma.orderRequest.count({
      where: {
        product: {
          ownerId: userId,
        },
      },
    });

    return orderCount;
  }

  private async calculateReferralStats(userId: number): Promise<ReferralStats> {
    // Count total referrals made by this user
    const referralCount = await this.prisma.referral.count({
      where: {
        referrerId: userId,
      },
    });

    // Get user's referral code from profile
    const profile = await this.prisma.profile.findUnique({
      where: {
        userId,
      },
      select: {
        referralCode: true,
      },
    });

    return {
      totalReferrals: referralCount,
      referralCode: profile?.referralCode || '',
    };
  }

  private async calculateMonthlyEarnings(
    userId: number,
  ): Promise<MonthlyEarnings[]> {
    // Get the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get payments from the last 12 months
    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [
          { userId, status: 'PAID' },
          { referrerId: userId, status: 'PAID' },
        ],
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        userId: true,
        referrerId: true,
        userShare: true,
        referrerShare: true,
        createdAt: true,
      },
    });

    // Group payments by month
    const monthlyData: { [key: string]: number } = {};

    payments.forEach((payment) => {
      const monthKey = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM format

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }

      // Add user share if this user is the seller
      if (payment.userId === userId && payment.userShare) {
        monthlyData[monthKey] += Number(payment.userShare);
      }

      // Add referrer share if this user is the referrer
      if (payment.referrerId === userId && payment.referrerShare) {
        monthlyData[monthKey] += Number(payment.referrerShare);
      }
    });

    // Convert to array and sort by month
    const monthlyEarnings: MonthlyEarnings[] = Object.entries(monthlyData)
      .map(([month, earnings]) => ({ month, earnings }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return monthlyEarnings;
  }

  private async calculateCategorySales(
    userId: number,
  ): Promise<CategorySales[]> {
    // Get orders for user's products that are completed
    const categoryData = await this.prisma.orderRequest.groupBy({
      by: ['productId'],
      where: {
        product: {
          ownerId: userId,
        },
        status: {
          in: ['DELIVERED', 'CONFIRMED'],
        },
      },
      _count: {
        id: true,
      },
    });

    // We need to get the actual product categories
    const productIds = categoryData.map((item) => item.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        category: true,
      },
    });

    // Create a map of product ID to category
    const productCategoryMap = new Map(
      products.map((product) => [product.id, product.category]),
    );

    // Group by category
    const categorySalesMap: { [key: string]: number } = {};

    categoryData.forEach((item) => {
      const category = productCategoryMap.get(item.productId);
      if (category) {
        if (!categorySalesMap[category]) {
          categorySalesMap[category] = 0;
        }
        categorySalesMap[category] += item._count.id;
      }
    });

    // Convert to array and sort by order count (descending)
    const categorySales: CategorySales[] = Object.entries(categorySalesMap)
      .map(([category, orderCount]) => ({ category, orderCount }))
      .sort((a, b) => b.orderCount - a.orderCount);

    return categorySales;
  }

  private async getRecentOrders(userId: number): Promise<RecentOrder[]> {
    const recentOrders = await this.prisma.orderRequest.findMany({
      where: {
        product: {
          ownerId: userId,
        },
      },
      include: {
        product: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return recentOrders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      productName: order.product.title,
      decidedPrice: Number(order.decidedPrice),
      status: order.status,
      createdAt: order.createdAt,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
    }));
  }
}
