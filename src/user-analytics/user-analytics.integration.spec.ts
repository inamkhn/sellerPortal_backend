import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../database/database.service';
import { UserAnalyticsModule } from './user-analytics.module';
import { JwtService } from '@nestjs/jwt';
import { Role, PaymentStatus } from '@prisma/client';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

describe('UserAnalyticsController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  let testUser: any;
  let testUserToken: string;
  let otherUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserAnalyticsModule, DatabaseModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test users
    testUser = await prismaService.user.create({
      data: {
        email: 'analytics-test@example.com',
        password: 'hashedPassword',
        firstName: 'Analytics',
        lastName: 'User',
        role: Role.USER,
        isVerified: true,
      },
    });

    otherUser = await prismaService.user.create({
      data: {
        email: 'other-user@example.com',
        password: 'hashedPassword',
        firstName: 'Other',
        lastName: 'User',
        role: Role.USER,
        isVerified: true,
      },
    });

    // Create profile for test user with referral code
    await prismaService.profile.create({
      data: {
        userId: testUser.id,
        fullName: 'Analytics User',
        referralCode: 'TESTREF123',
        verified: true,
      },
    });

    // Generate JWT token for test user
    testUserToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.payment.deleteMany({
      where: {
        OR: [{ userId: testUser.id }, { referrerId: testUser.id }],
      },
    });

    await prismaService.orderRequest.deleteMany({
      where: {
        OR: [{ userId: testUser.id }, { product: { ownerId: testUser.id } }],
      },
    });

    await prismaService.product.deleteMany({
      where: { ownerId: testUser.id },
    });

    await prismaService.referral.deleteMany({
      where: {
        OR: [{ referrerId: testUser.id }, { refereeId: testUser.id }],
      },
    });

    await prismaService.profile.deleteMany({
      where: {
        OR: [{ userId: testUser.id }, { userId: otherUser.id }],
      },
    });

    await prismaService.user.deleteMany({
      where: {
        id: { in: [testUser.id, otherUser.id] },
      },
    });

    await app.close();
  });

  describe('GET /api/v1/user/analytics', () => {
    it('should return analytics for user with no activity', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/user/analytics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          totalEarnings: 0,
          totalProducts: 0,
          totalOrders: 0,
          referralStats: {
            totalReferrals: 0,
            referralCode: 'TESTREF123',
          },
        },
      });
    });

    it('should return analytics with products and orders', async () => {
      // Create test products
      const product1 = await prismaService.product.create({
        data: {
          ownerId: testUser.id,
          title: 'Test Chair',
          description: 'A comfortable chair',
          price: 299.99,
          category: 'CHAIRS',
          condition: 'NEW',
          quantity: 1,
        },
      });

      const product2 = await prismaService.product.create({
        data: {
          ownerId: testUser.id,
          title: 'Test Table',
          description: 'A wooden table',
          price: 599.99,
          category: 'TABLES',
          condition: 'LIKE_NEW',
          quantity: 1,
        },
      });

      // Create test orders
      const order1 = await prismaService.orderRequest.create({
        data: {
          userId: otherUser.id,
          productId: product1.id,
          decidedPrice: 299.99,
          customerName: 'Customer One',
          customerPhone: '1234567890',
          customerWhatsapp: '1234567890',
          customerEmail: 'customer1@example.com',
          status: 'CONFIRMED',
        },
      });

      const order2 = await prismaService.orderRequest.create({
        data: {
          userId: otherUser.id,
          productId: product2.id,
          decidedPrice: 599.99,
          customerName: 'Customer Two',
          customerPhone: '0987654321',
          customerWhatsapp: '0987654321',
          customerEmail: 'customer2@example.com',
          status: 'PENDING',
        },
      });

      // Create test payments
      await prismaService.payment.create({
        data: {
          orderRequestId: order1.id,
          userId: testUser.id,
          userShare: 250.0,
          totalPrice: 299.99,
          status: PaymentStatus.PAID,
        },
      });

      await prismaService.payment.create({
        data: {
          orderRequestId: order2.id,
          userId: testUser.id,
          userShare: 500.0,
          totalPrice: 599.99,
          status: PaymentStatus.PENDING, // This shouldn't count in earnings
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/user/analytics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          totalEarnings: 250, // Only paid payment counts
          totalProducts: 2,
          totalOrders: 2,
          referralStats: {
            totalReferrals: 0,
            referralCode: 'TESTREF123',
          },
        },
      });
    });

    it('should include referral earnings and count', async () => {
      // Create a referral
      await prismaService.referral.create({
        data: {
          referrerId: testUser.id,
          refereeId: otherUser.id,
        },
      });

      // Create a referral payment
      const product = await prismaService.product.create({
        data: {
          ownerId: otherUser.id,
          title: 'Referral Product',
          description: 'Product from referred user',
          price: 199.99,
          category: 'SOFAS',
          condition: 'GOOD',
          quantity: 1,
        },
      });

      const order = await prismaService.orderRequest.create({
        data: {
          userId: testUser.id,
          productId: product.id,
          decidedPrice: 199.99,
          customerName: 'Referral Customer',
          customerPhone: '5555555555',
          customerWhatsapp: '5555555555',
          customerEmail: 'referral@example.com',
          status: 'DELIVERED',
        },
      });

      await prismaService.payment.create({
        data: {
          orderRequestId: order.id,
          userId: otherUser.id,
          userShare: 150.0,
          referrerId: testUser.id,
          referrerShare: 30.0,
          totalPrice: 199.99,
          status: PaymentStatus.PAID,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/user/analytics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.data.totalEarnings).toBe(280); // 250 + 30 referral share
      expect(response.body.data.referralStats.totalReferrals).toBe(1);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/user/analytics')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/user/analytics')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle database errors gracefully', async () => {
      // Temporarily close database connection to simulate error
      await prismaService.$disconnect();

      const response = await request(app.getHttpServer())
        .get('/api/v1/user/analytics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ANALYTICS_CALCULATION_FAILED');

      // Reconnect for cleanup
      await prismaService.$connect();
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/user/analytics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/user/analytics')
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200),
        );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All requests should complete successfully
      responses.forEach((response) => {
        expect(response.body.success).toBe(true);
      });

      // Total time for 5 concurrent requests should be reasonable
      expect(totalTime).toBeLessThan(5000);
    });
  });
});
