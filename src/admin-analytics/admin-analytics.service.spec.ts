import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsService } from './admin-analytics.service';
import { PrismaService } from '../database/database.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;

  const mockPrismaService = {
    payment: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    orderRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminAnalyticsService>(AdminAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAdminAnalytics', () => {
    it('should return complete admin analytics data', async () => {
      // Mock total revenue
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { totalPrice: new Decimal(125750.75) },
      });

      // Mock counts
      mockPrismaService.orderRequest.count.mockResolvedValue(450);
      mockPrismaService.user.count.mockResolvedValue(1250);

      // Mock monthly data
      mockPrismaService.payment.findMany.mockResolvedValue([
        {
          totalPrice: new Decimal(5000),
          createdAt: new Date('2024-01-15'),
          orderRequest: { createdAt: new Date('2024-01-15') },
        },
      ]);

      // Mock category sales, top products, and top customers
      mockPrismaService.payment.groupBy
        .mockResolvedValueOnce([
          {
            orderRequestId: 1,
            _sum: { totalPrice: new Decimal(2000) },
            _count: { id: 5 },
          },
        ])
        .mockResolvedValueOnce([
          {
            orderRequestId: 1,
            _sum: { totalPrice: new Decimal(2000) },
            _count: { id: 5 },
          },
        ])
        .mockResolvedValueOnce([
          {
            orderRequestId: 1,
            _sum: { totalPrice: new Decimal(2000) },
            _count: { id: 5 },
          },
        ]);

      mockPrismaService.orderRequest.findMany
        .mockResolvedValueOnce([{ id: 1, product: { category: 'CHAIRS' } }])
        .mockResolvedValueOnce([
          {
            id: 1,
            product: { id: 1, title: 'Test Chair', category: 'CHAIRS' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 1,
            user: {
              id: 1,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
          },
        ]);

      const result = await service.calculateAdminAnalytics();

      expect(result.totalRevenue).toBe(125750.75);
      expect(result.totalOrders).toBe(450);
      expect(result.totalUsers).toBe(1250);
      expect(Array.isArray(result.monthlyData)).toBe(true);
      expect(Array.isArray(result.salesByCategory)).toBe(true);
      expect(Array.isArray(result.topProducts)).toBe(true);
      expect(Array.isArray(result.topCustomers)).toBe(true);
    });
  });

  describe('calculateTotalRevenue', () => {
    it('should calculate total revenue from paid orders', async () => {
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { totalPrice: new Decimal(50000.5) },
      });

      const result = await service['calculateTotalRevenue']();

      expect(result).toBe(50000.5);
    });

    it('should return zero when no revenue exists', async () => {
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { totalPrice: null },
      });

      const result = await service['calculateTotalRevenue']();

      expect(result).toBe(0);
    });
  });

  describe('countTotalOrders', () => {
    it('should count all orders', async () => {
      mockPrismaService.orderRequest.count.mockResolvedValue(100);

      const result = await service['countTotalOrders']();

      expect(result).toBe(100);
    });
  });

  describe('countTotalUsers', () => {
    it('should count all users', async () => {
      mockPrismaService.user.count.mockResolvedValue(500);

      const result = await service['countTotalUsers']();

      expect(result).toBe(500);
    });
  });
});
