import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../database/database.service';
import { AdminAnalyticsModule } from './admin-analytics.module';
import { JwtService } from '@nestjs/jwt';
import { Role, PaymentStatus } from '@prisma/client';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

describe('AdminAnalyticsController (Integration)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AdminAnalyticsModule, DatabaseModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test users
    adminUser = await prismaService.user.create({
      data: {
        email: 'admin@example.com',
        password: 'hashedPassword',
        firstName: 'Admin',
        lastName: 'User',
        role: Role.ADMIN,
        isVerified: true,
      },
    });

    regularUser = await prismaService.user.create({
      data: {
        email: 'user@example.com',
        password: 'hashedPassword',
        firstName: 'Regular',
        lastName: 'User',
        role: Role.USER,
        isVerified: true,
      },
    });

    // Generate JWT tokens
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    userToken = jwtService.sign({
      sub: regularUser.id,
      email: regularUser.email,
      role: regularUser.role,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.payment.deleteMany({});
    await prismaService.orderRequest.deleteMany({});
    await prismaService.product.deleteMany({});
    await prismaService.profile.deleteMany({});
    await prismaService.user.deleteMany({
      where: {
        id: { in: [adminUser.id, regularUser.id] },
      },
    });

    await app.close();
  });

  describe('GET /api/v1/admin/analytics', () => {
    it('should return admin analytics for admin user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          totalRevenue: expect.any(Number),
          totalOrders: expect.any(Number),
          totalUsers: expect.any(Number),
          monthlyData: expect.any(Array),
          salesByCategory: expect.any(Array),
          topProducts: expect.any(Array),
          topCustomers: expect.any(Array),
        },
      });

      // Verify data structure
      expect(response.body.data.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(response.body.data.totalOrders).toBeGreaterThanOrEqual(0);
      expect(response.body.data.totalUsers).toBeGreaterThanOrEqual(2); // At least our test users
    });

    it('should return analytics with test data', async () => {
      // Create test product
      const product = await prismaService.product.create({
        data: {
          ownerId: regularUser.id,
          title: 'Test Admin Chair',
          description: 'A chair for admin testing',
          price: 500.0,
          category: 'CHAIRS',
          condition: 'NEW',
          quantity: 1,
        },
      });

      // Create test order
      const order = await prismaService.orderRequest.create({
        data: {
          userId: adminUser.id,
          productId: product.id,
          decidedPrice: 500.0,
          customerName: 'Admin Customer',
          customerPhone: '1234567890',
          customerWhatsapp: '1234567890',
          customerEmail: 'admin.customer@example.com',
          status: 'DELIVERED',
        },
      });

      // Create test payment
      await prismaService.payment.create({
        data: {
          orderRequestId: order.id,
          userId: regularUser.id,
          userShare: 400.0,
          totalPrice: 500.0,
          status: PaymentStatus.PAID,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.totalRevenue).toBeGreaterThanOrEqual(500);
      expect(response.body.data.totalOrders).toBeGreaterThanOrEqual(1);
      expect(response.body.data.salesByCategory.length).toBeGreaterThanOrEqual(
        0,
      );
    });

    it('should return 403 for regular user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN_ACCESS');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });

    it('should handle concurrent admin requests efficiently', async () => {
      const concurrentRequests = Array(3)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/admin/analytics')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200),
        );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All requests should complete successfully
      responses.forEach((response) => {
        expect(response.body.success).toBe(true);
      });

      // Total time for 3 concurrent requests should be reasonable
      expect(totalTime).toBeLessThan(8000);
    });
  });
});
