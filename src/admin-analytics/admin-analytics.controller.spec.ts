import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminAnalyticsData } from './interfaces/admin-analytics.interface';

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;

  const mockAnalyticsData: AdminAnalyticsData = {
    totalRevenue: 125750.75,
    totalOrders: 450,
    totalUsers: 1250,
    monthlyData: [{ month: '2024-01', revenue: 15000, orderCount: 50 }],
    salesByCategory: [
      { category: 'CHAIRS', totalRevenue: 25000, orderCount: 100 },
    ],
    topProducts: [
      {
        id: 1,
        title: 'Luxury Chair',
        category: 'CHAIRS',
        totalRevenue: 5000,
        orderCount: 10,
        averagePrice: 500,
      },
    ],
    topCustomers: [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        totalOrders: 5,
        totalSpent: 2500,
        averageOrderValue: 500,
      },
    ],
  };

  const mockAdminAnalyticsService = {
    calculateAdminAnalytics: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockAdminRoleGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAnalyticsController],
      providers: [
        { provide: AdminAnalyticsService, useValue: mockAdminAnalyticsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(AdminRoleGuard)
      .useValue(mockAdminRoleGuard)
      .compile();

    controller = module.get<AdminAnalyticsController>(AdminAnalyticsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAdminAnalytics', () => {
    it('should return admin analytics successfully', async () => {
      mockAdminAnalyticsService.calculateAdminAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      const result = await controller.getAdminAnalytics();

      expect(result).toEqual({
        success: true,
        data: mockAnalyticsData,
      });
      expect(
        mockAdminAnalyticsService.calculateAdminAnalytics,
      ).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const serviceError = new Error('Database connection failed');
      mockAdminAnalyticsService.calculateAdminAnalytics.mockRejectedValue(
        serviceError,
      );

      await expect(controller.getAdminAnalytics()).rejects.toThrow(
        serviceError,
      );
    });

    it('should be protected by authentication guards', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        AdminAnalyticsController,
      );
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(AdminRoleGuard);
    });

    it('should return analytics with all required fields', async () => {
      mockAdminAnalyticsService.calculateAdminAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      const result = await controller.getAdminAnalytics();

      expect(result.data).toHaveProperty('totalRevenue');
      expect(result.data).toHaveProperty('totalOrders');
      expect(result.data).toHaveProperty('totalUsers');
      expect(result.data).toHaveProperty('monthlyData');
      expect(result.data).toHaveProperty('salesByCategory');
      expect(result.data).toHaveProperty('topProducts');
      expect(result.data).toHaveProperty('topCustomers');
    });

    it('should maintain data types in response', async () => {
      mockAdminAnalyticsService.calculateAdminAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      const result = await controller.getAdminAnalytics();

      expect(typeof result.data.totalRevenue).toBe('number');
      expect(typeof result.data.totalOrders).toBe('number');
      expect(typeof result.data.totalUsers).toBe('number');
      expect(Array.isArray(result.data.monthlyData)).toBe(true);
      expect(Array.isArray(result.data.salesByCategory)).toBe(true);
      expect(Array.isArray(result.data.topProducts)).toBe(true);
      expect(Array.isArray(result.data.topCustomers)).toBe(true);
    });
  });
});
