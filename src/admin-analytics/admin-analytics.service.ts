import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import {
  AdminAnalyticsData,
  MonthlyRevenue,
  CategorySales,
  TopProduct,
  TopCustomer,
} from './interfaces/admin-analytics.interface';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async calculateAdminAnalytics(): Promise<AdminAnalyticsData> {
    const startTime = Date.now();
    this.logger.debug('Starting admin analytics calculation');

    try {
      const [
        totalRevenue,
        totalOrders,
        totalUsers,
        monthlyData,
        salesByCategory,
        topProducts,
        topCustomers,
      ] = await Promise.all([
        this.calculateTotalRevenue(),
        this.countTotalOrders(),
        this.countTotalUsers(),
        this.calculateMonthlyData(),
        this.calculateSalesByCategory(),
        this.getTopProducts(),
        this.getTopCustomers(),
      ]);

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Admin analytics calculation completed in ${executionTime}ms`,
      );

      if (executionTime > 2000) {
        this.logger.warn(
          `Slow admin analytics calculation: ${executionTime}ms`,
        );
      }

      return {
        totalRevenue,
        totalOrders,
        totalUsers,
        monthlyData,
        salesByCategory,
        topProducts,
        topCustomers,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Admin analytics calculation failed after ${executionTime}ms`,
        error,
      );
      throw error;
    }
  }

  private async calculateTotalRevenue(): Promise<number> {
    // Calculate total revenue from all paid orders
    const result = await this.prisma.payment.aggregate({
      where: {
        status: 'PAID',
      },
      _sum: {
        totalPrice: true,
      },
    });

    return Number(result._sum.totalPrice || 0);
  }

  private async countTotalOrders(): Promise<number> {
    const orderCount = await this.prisma.orderRequest.count();
    return orderCount;
  }

  private async countTotalUsers(): Promise<number> {
    const userCount = await this.prisma.user.count();
    return userCount;
  }

  private async calculateMonthlyData(): Promise<MonthlyRevenue[]> {
    // Get the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get payments and orders from the last 12 months
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        totalPrice: true,
        createdAt: true,
        orderRequest: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    // Group by month
    const monthlyMap: {
      [key: string]: { revenue: number; orderCount: number };
    } = {};

    payments.forEach((payment) => {
      const monthKey = payment.createdAt.toISOString().substring(0, 7); // YYYY-MM format

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { revenue: 0, orderCount: 0 };
      }

      monthlyMap[monthKey].revenue += Number(payment.totalPrice);
      monthlyMap[monthKey].orderCount += 1;
    });

    // Convert to array and sort by month
    const monthlyData: MonthlyRevenue[] = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        orderCount: data.orderCount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return monthlyData;
  }

  private async calculateSalesByCategory(): Promise<CategorySales[]> {
    // Get sales data grouped by product category
    const categoryData = await this.prisma.payment.groupBy({
      by: ['orderRequestId'],
      where: {
        status: 'PAID',
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    if (categoryData.length === 0) {
      return [];
    }

    // Get order request IDs to fetch product categories
    const orderRequestIds = categoryData.map((item) => item.orderRequestId);

    const orderRequests = await this.prisma.orderRequest.findMany({
      where: {
        id: {
          in: orderRequestIds,
        },
      },
      include: {
        product: {
          select: {
            category: true,
          },
        },
      },
    });

    // Create a map of order request ID to category
    const orderCategoryMap = new Map(
      orderRequests.map((order) => [order.id, order.product.category]),
    );

    // Group by category
    const categorySalesMap: {
      [key: string]: { revenue: number; orderCount: number };
    } = {};

    categoryData.forEach((item) => {
      const category = orderCategoryMap.get(item.orderRequestId);
      if (category) {
        if (!categorySalesMap[category]) {
          categorySalesMap[category] = { revenue: 0, orderCount: 0 };
        }
        categorySalesMap[category].revenue += Number(item._sum.totalPrice || 0);
        categorySalesMap[category].orderCount += item._count.id;
      }
    });

    // Convert to array and sort by revenue (descending)
    const salesByCategory: CategorySales[] = Object.entries(categorySalesMap)
      .map(([category, data]) => ({
        category,
        totalRevenue: data.revenue,
        orderCount: data.orderCount,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return salesByCategory;
  }

  private async getTopProducts(): Promise<TopProduct[]> {
    // Get top products by revenue
    const productSales = await this.prisma.payment.groupBy({
      by: ['orderRequestId'],
      where: {
        status: 'PAID',
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    if (productSales.length === 0) {
      return [];
    }

    // Get order request IDs to fetch product details
    const orderRequestIds = productSales.map((item) => item.orderRequestId);

    const orderRequests = await this.prisma.orderRequest.findMany({
      where: {
        id: {
          in: orderRequestIds,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    // Group by product
    const productMap: {
      [key: number]: { revenue: number; orderCount: number; product: any };
    } = {};

    orderRequests.forEach((order) => {
      const productId = order.product.id;
      const paymentData = productSales.find(
        (p) => p.orderRequestId === order.id,
      );

      if (paymentData) {
        if (!productMap[productId]) {
          productMap[productId] = {
            revenue: 0,
            orderCount: 0,
            product: order.product,
          };
        }
        productMap[productId].revenue += Number(
          paymentData._sum.totalPrice || 0,
        );
        productMap[productId].orderCount += paymentData._count.id;
      }
    });

    // Convert to array and sort by revenue (descending)
    const topProducts: TopProduct[] = Object.entries(productMap)
      .map(([productId, data]) => ({
        id: Number(productId),
        title: data.product.title,
        category: data.product.category,
        totalRevenue: data.revenue,
        orderCount: data.orderCount,
        averagePrice: data.revenue / data.orderCount,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10); // Top 10 products

    return topProducts;
  }

  private async getTopCustomers(): Promise<TopCustomer[]> {
    // Get top customers by order count and spending
    const customerData = await this.prisma.payment.groupBy({
      by: ['orderRequestId'],
      where: {
        status: 'PAID',
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    if (customerData.length === 0) {
      return [];
    }

    // Get order request IDs to fetch customer details
    const orderRequestIds = customerData.map((item) => item.orderRequestId);

    const orderRequests = await this.prisma.orderRequest.findMany({
      where: {
        id: {
          in: orderRequestIds,
        },
      },
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
    });

    // Group by customer
    const customerMap: {
      [key: number]: { totalSpent: number; orderCount: number; user: any };
    } = {};

    orderRequests.forEach((order) => {
      const userId = order.user.id;
      const paymentData = customerData.find(
        (p) => p.orderRequestId === order.id,
      );

      if (paymentData) {
        if (!customerMap[userId]) {
          customerMap[userId] = {
            totalSpent: 0,
            orderCount: 0,
            user: order.user,
          };
        }
        customerMap[userId].totalSpent += Number(
          paymentData._sum.totalPrice || 0,
        );
        customerMap[userId].orderCount += paymentData._count.id;
      }
    });

    // Convert to array and sort by total orders (descending)
    const topCustomers: TopCustomer[] = Object.entries(customerMap)
      .map(([userId, data]) => ({
        id: Number(userId),
        name:
          `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() ||
          'N/A',
        email: data.user.email,
        totalOrders: data.orderCount,
        totalSpent: data.totalSpent,
        averageOrderValue: data.totalSpent / data.orderCount,
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10); // Top 10 customers

    return topCustomers;
  }
}
