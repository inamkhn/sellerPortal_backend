import { Test, TestingModule } from '@nestjs/testing';
import { UserAnalyticsController } from './user-analytics.controller';
import { UserAnalyticsService } from './user-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { UserAnalyticsData } from './interfaces/user-analytics.interface';

describe('UserAnalyticsController', () => {
  let controller: UserAnalyticsController;
  let userAnalyticsService: UserAnalyticsService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: Role.USER,
    isVerified: true,
    googleId: null,
    avatar: null,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshToken: 'mock-refresh-token',
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    passwordResetToken: null,
    passwordResetTokenExpiry: null,
  };

  const mockAnalyticsData: UserAnalyticsData = {
    totalEarnings: 1250.75,
    totalProducts: 12,
    totalOrders: 8,
    referralStats: {
      totalReferrals: 5,
      referralCode: 'REF123ABC',
    },
  };

  const mockUserAnalyticsService = {
    calculateUserAnalytics: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAnalyticsController],
      providers: [
        { provide: UserAnalyticsService, useValue: mockUserAnalyticsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UserAnalyticsController>(UserAnalyticsController);
    userAnalyticsService =
      module.get<UserAnalyticsService>(UserAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics successfully', async () => {
      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      const result = await controller.getUserAnalytics(mockUser);

      expect(result).toEqual({
        success: true,
        data: mockAnalyticsData,
      });
      expect(
        mockUserAnalyticsService.calculateUserAnalytics,
      ).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle service errors gracefully', async () => {
      const serviceError = new Error('Database connection failed');
      mockUserAnalyticsService.calculateUserAnalytics.mockRejectedValue(
        serviceError,
      );

      await expect(controller.getUserAnalytics(mockUser)).rejects.toThrow(
        serviceError,
      );
      expect(
        mockUserAnalyticsService.calculateUserAnalytics,
      ).toHaveBeenCalledWith(mockUser.id);
    });

    it('should call service with correct user ID', async () => {
      const differentUser = { ...mockUser, id: 999 };
      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      await controller.getUserAnalytics(differentUser);

      expect(
        mockUserAnalyticsService.calculateUserAnalytics,
      ).toHaveBeenCalledWith(999);
    });

    it('should return analytics with zero values when user has no activity', async () => {
      const emptyAnalyticsData: UserAnalyticsData = {
        totalEarnings: 0,
        totalProducts: 0,
        totalOrders: 0,
        referralStats: {
          totalReferrals: 0,
          referralCode: 'REF000000',
        },
      };

      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        emptyAnalyticsData,
      );

      const result = await controller.getUserAnalytics(mockUser);

      expect(result).toEqual({
        success: true,
        data: emptyAnalyticsData,
      });
    });

    it('should handle analytics data with high values', async () => {
      const highValueAnalyticsData: UserAnalyticsData = {
        totalEarnings: 999999.99,
        totalProducts: 1000,
        totalOrders: 500,
        referralStats: {
          totalReferrals: 100,
          referralCode: 'REFVIP001',
        },
      };

      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        highValueAnalyticsData,
      );

      const result = await controller.getUserAnalytics(mockUser);

      expect(result).toEqual({
        success: true,
        data: highValueAnalyticsData,
      });
    });
  });

  describe('Authentication', () => {
    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', UserAnalyticsController);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should extract user from JWT token', async () => {
      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      await controller.getUserAnalytics(mockUser);

      // Verify that the user object passed to the service contains the expected ID
      expect(
        mockUserAnalyticsService.calculateUserAnalytics,
      ).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('Response Format', () => {
    it('should always return success: true for successful requests', async () => {
      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      const result = await controller.getUserAnalytics(mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should include all required analytics fields in response', async () => {
      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      const result = await controller.getUserAnalytics(mockUser);

      expect(result.data).toHaveProperty('totalEarnings');
      expect(result.data).toHaveProperty('totalProducts');
      expect(result.data).toHaveProperty('totalOrders');
      expect(result.data).toHaveProperty('referralStats');
      expect(result.data.referralStats).toHaveProperty('totalReferrals');
      expect(result.data.referralStats).toHaveProperty('referralCode');
    });

    it('should maintain data types in response', async () => {
      mockUserAnalyticsService.calculateUserAnalytics.mockResolvedValue(
        mockAnalyticsData,
      );

      const result = await controller.getUserAnalytics(mockUser);

      expect(typeof result.data.totalEarnings).toBe('number');
      expect(typeof result.data.totalProducts).toBe('number');
      expect(typeof result.data.totalOrders).toBe('number');
      expect(typeof result.data.referralStats.totalReferrals).toBe('number');
      expect(typeof result.data.referralStats.referralCode).toBe('string');
    });
  });
});
