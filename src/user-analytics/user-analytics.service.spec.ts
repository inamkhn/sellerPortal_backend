import { Test, TestingModule } from '@nestjs/testing';
import { UserAnalyticsService } from './user-analytics.service';
import { PrismaService } from '../database/database.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('UserAnalyticsService', () => {
  let service: UserAnalyticsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    payment: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    orderRequest: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    referral: {
      count: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserAnalyticsService>(UserAnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateUserAnalytics', () => {
    it('should return complete analytics data for a user', async () => {
      const userId = 1;

      // Mock all the individual method calls
      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { userShare: new Decimal(500.5) } }) // User earnings
        .mockResolvedValueOnce({
          _sum: { referrerShare: new Decimal(150.25) },
        }); // Referrer earnings

      mockPrismaService.product.count.mockResolvedValue(12);
      mockPrismaService.orderRequest.count.mockResolvedValue(8);
      mockPrismaService.referral.count.mockResolvedValue(5);
      mockPrismaService.profile.findUnique.mockResolvedValue({
        referralCode: 'REF123ABC',
      });

      // Mock new features
      mockPrismaService.payment.findMany.mockResolvedValue([
        {
          userId: 1,
          referrerId: null,
          userShare: new Decimal(300),
          referrerShare: null,
          createdAt: new Date('2024-01-15'),
        },
      ]);

      mockPrismaService.orderRequest.groupBy.mockResolvedValue([
        { productId: 1, _count: { id: 3 } },
      ]);

      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 1, category: 'CHAIRS' },
      ]);

      mockPrismaService.orderRequest.findMany.mockResolvedValue([
        {
          id: 1,
          customerName: 'John Doe',
          decidedPrice: new Decimal(299.99),
          status: 'CONFIRMED',
          createdAt: new Date('2024-01-15'),
          customerPhone: '1234567890',
          customerEmail: 'john@example.com',
          product: { title: 'Test Chair' },
        },
      ]);

      const result = await service.calculateUserAnalytics(userId);

      expect(result).toEqual({
        totalEarnings: 650.75,
        totalProducts: 12,
        totalOrders: 8,
        referralStats: {
          totalReferrals: 5,
          referralCode: 'REF123ABC',
        },
        monthlyEarnings: [{ month: '2024-01', earnings: 300 }],
        categorySales: [{ category: 'CHAIRS', orderCount: 3 }],
        recentOrders: [
          {
            id: 1,
            customerName: 'John Doe',
            productName: 'Test Chair',
            decidedPrice: 299.99,
            status: 'CONFIRMED',
            createdAt: new Date('2024-01-15'),
            customerPhone: '1234567890',
            customerEmail: 'john@example.com',
          },
        ],
      });
    });
  });

  describe('calculateTotalEarnings', () => {
    it('should calculate total earnings from user sales and referrals', async () => {
      const userId = 1;

      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { userShare: new Decimal(1000.5) } })
        .mockResolvedValueOnce({
          _sum: { referrerShare: new Decimal(250.25) },
        });

      const result = await service['calculateTotalEarnings'](userId);

      expect(result).toBe(1250.75);
      expect(mockPrismaService.payment.aggregate).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.payment.aggregate).toHaveBeenNthCalledWith(1, {
        where: { userId, status: 'PAID' },
        _sum: { userShare: true },
      });
      expect(mockPrismaService.payment.aggregate).toHaveBeenNthCalledWith(2, {
        where: { referrerId: userId, status: 'PAID' },
        _sum: { referrerShare: true },
      });
    });

    it('should handle null earnings gracefully', async () => {
      const userId = 1;

      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { userShare: null } })
        .mockResolvedValueOnce({ _sum: { referrerShare: null } });

      const result = await service['calculateTotalEarnings'](userId);

      expect(result).toBe(0);
    });

    it('should handle mixed null and valid earnings', async () => {
      const userId = 1;

      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { userShare: new Decimal(500.0) } })
        .mockResolvedValueOnce({ _sum: { referrerShare: null } });

      const result = await service['calculateTotalEarnings'](userId);

      expect(result).toBe(500);
    });
  });

  describe('countUserProducts', () => {
    it('should count products owned by user', async () => {
      const userId = 1;
      mockPrismaService.product.count.mockResolvedValue(15);

      const result = await service['countUserProducts'](userId);

      expect(result).toBe(15);
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { ownerId: userId },
      });
    });

    it('should return zero when user has no products', async () => {
      const userId = 1;
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service['countUserProducts'](userId);

      expect(result).toBe(0);
    });
  });

  describe('countUserOrders', () => {
    it('should count orders for user products', async () => {
      const userId = 1;
      mockPrismaService.orderRequest.count.mockResolvedValue(10);

      const result = await service['countUserOrders'](userId);

      expect(result).toBe(10);
      expect(mockPrismaService.orderRequest.count).toHaveBeenCalledWith({
        where: {
          product: { ownerId: userId },
        },
      });
    });

    it('should return zero when user has no orders', async () => {
      const userId = 1;
      mockPrismaService.orderRequest.count.mockResolvedValue(0);

      const result = await service['countUserOrders'](userId);

      expect(result).toBe(0);
    });
  });

  describe('calculateReferralStats', () => {
    it('should return referral count and code', async () => {
      const userId = 1;
      mockPrismaService.referral.count.mockResolvedValue(7);
      mockPrismaService.profile.findUnique.mockResolvedValue({
        referralCode: 'REF456DEF',
      });

      const result = await service['calculateReferralStats'](userId);

      expect(result).toEqual({
        totalReferrals: 7,
        referralCode: 'REF456DEF',
      });
      expect(mockPrismaService.referral.count).toHaveBeenCalledWith({
        where: { referrerId: userId },
      });
      expect(mockPrismaService.profile.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { referralCode: true },
      });
    });

    it('should handle user with no referrals', async () => {
      const userId = 1;
      mockPrismaService.referral.count.mockResolvedValue(0);
      mockPrismaService.profile.findUnique.mockResolvedValue({
        referralCode: 'REF789GHI',
      });

      const result = await service['calculateReferralStats'](userId);

      expect(result).toEqual({
        totalReferrals: 0,
        referralCode: 'REF789GHI',
      });
    });

    it('should handle user with no profile', async () => {
      const userId = 1;
      mockPrismaService.referral.count.mockResolvedValue(3);
      mockPrismaService.profile.findUnique.mockResolvedValue(null);

      const result = await service['calculateReferralStats'](userId);

      expect(result).toEqual({
        totalReferrals: 3,
        referralCode: '',
      });
    });

    it('should handle user with profile but no referral code', async () => {
      const userId = 1;
      mockPrismaService.referral.count.mockResolvedValue(2);
      mockPrismaService.profile.findUnique.mockResolvedValue({
        referralCode: null,
      });

      const result = await service['calculateReferralStats'](userId);

      expect(result).toEqual({
        totalReferrals: 2,
        referralCode: '',
      });
    });
  });

  describe('calculateMonthlyEarnings', () => {
    it('should calculate monthly earnings for the last 12 months', async () => {
      const userId = 1;
      const mockPayments = [
        {
          userId: 1,
          referrerId: null,
          userShare: new Decimal(300),
          referrerShare: null,
          createdAt: new Date('2024-01-15'),
        },
        {
          userId: 2,
          referrerId: 1,
          userShare: new Decimal(200),
          referrerShare: new Decimal(50),
          createdAt: new Date('2024-02-10'),
        },
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service['calculateMonthlyEarnings'](userId);

      expect(result).toEqual([
        { month: '2024-01', earnings: 300 },
        { month: '2024-02', earnings: 50 },
      ]);
    });

    it('should return empty array when user has no payments', async () => {
      const userId = 1;
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await service['calculateMonthlyEarnings'](userId);

      expect(result).toEqual([]);
    });
  });

  describe('calculateCategorySales', () => {
    it('should calculate sales by product category', async () => {
      const userId = 1;

      mockPrismaService.orderRequest.groupBy.mockResolvedValue([
        { productId: 1, _count: { id: 3 } },
        { productId: 2, _count: { id: 2 } },
      ]);

      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 1, category: 'CHAIRS' },
        { id: 2, category: 'TABLES' },
      ]);

      const result = await service['calculateCategorySales'](userId);

      expect(result).toEqual([
        { category: 'CHAIRS', orderCount: 3 },
        { category: 'TABLES', orderCount: 2 },
      ]);
    });

    it('should return empty array when user has no completed orders', async () => {
      const userId = 1;
      mockPrismaService.orderRequest.groupBy.mockResolvedValue([]);

      const result = await service['calculateCategorySales'](userId);

      expect(result).toEqual([]);
    });

    it('should handle products with same category', async () => {
      const userId = 1;

      mockPrismaService.orderRequest.groupBy.mockResolvedValue([
        { productId: 1, _count: { id: 2 } },
        { productId: 2, _count: { id: 3 } },
      ]);

      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 1, category: 'CHAIRS' },
        { id: 2, category: 'CHAIRS' },
      ]);

      const result = await service['calculateCategorySales'](userId);

      expect(result).toEqual([{ category: 'CHAIRS', orderCount: 5 }]);
    });
  });

  describe('getRecentOrders', () => {
    it('should return recent orders for user products', async () => {
      const userId = 1;
      const mockOrders = [
        {
          id: 1,
          customerName: 'John Doe',
          decidedPrice: new Decimal(299.99),
          status: 'CONFIRMED',
          createdAt: new Date('2024-01-15'),
          customerPhone: '1234567890',
          customerEmail: 'john@example.com',
          product: { title: 'Test Chair' },
        },
        {
          id: 2,
          customerName: 'Jane Smith',
          decidedPrice: new Decimal(599.99),
          status: 'DELIVERED',
          createdAt: new Date('2024-01-10'),
          customerPhone: '0987654321',
          customerEmail: 'jane@example.com',
          product: { title: 'Test Table' },
        },
      ];

      mockPrismaService.orderRequest.findMany.mockResolvedValue(mockOrders);

      const result = await service['getRecentOrders'](userId);

      expect(result).toEqual([
        {
          id: 1,
          customerName: 'John Doe',
          productName: 'Test Chair',
          decidedPrice: 299.99,
          status: 'CONFIRMED',
          createdAt: new Date('2024-01-15'),
          customerPhone: '1234567890',
          customerEmail: 'john@example.com',
        },
        {
          id: 2,
          customerName: 'Jane Smith',
          productName: 'Test Table',
          decidedPrice: 599.99,
          status: 'DELIVERED',
          createdAt: new Date('2024-01-10'),
          customerPhone: '0987654321',
          customerEmail: 'jane@example.com',
        },
      ]);

      expect(mockPrismaService.orderRequest.findMany).toHaveBeenCalledWith({
        where: {
          product: { ownerId: userId },
        },
        include: {
          product: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return empty array when user has no orders', async () => {
      const userId = 1;
      mockPrismaService.orderRequest.findMany.mockResolvedValue([]);

      const result = await service['getRecentOrders'](userId);

      expect(result).toEqual([]);
    });
  });
});
