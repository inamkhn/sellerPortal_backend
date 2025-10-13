import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/database.service';
import { Role } from '@prisma/client';

describe('Chat Module (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  // Test users
  let userToken: string;
  let referralManagerToken: string;
  let adminToken: string;
  let unauthorizedToken: string;

  const testUsers: any = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test users
    testUsers.user = await prismaService.user.create({
      data: {
        email: 'user@test.com',
        role: Role.USER,
        firstName: 'Test',
        lastName: 'User',
      },
    });

    testUsers.referralManager = await prismaService.user.create({
      data: {
        email: 'referral@test.com',
        role: Role.REFERRAL_MANAGER,
        firstName: 'Referral',
        lastName: 'Manager',
      },
    });

    testUsers.admin = await prismaService.user.create({
      data: {
        email: 'admin@test.com',
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
      },
    });

    testUsers.unauthorized = await prismaService.user.create({
      data: {
        email: 'unauthorized@test.com',
        role: 'INVALID_ROLE' as Role,
        firstName: 'Unauthorized',
        lastName: 'User',
      },
    });

    // Generate JWT tokens
    userToken = jwtService.sign({
      sub: testUsers.user.id,
      email: testUsers.user.email,
      role: testUsers.user.role,
    });

    referralManagerToken = jwtService.sign({
      sub: testUsers.referralManager.id,
      email: testUsers.referralManager.email,
      role: testUsers.referralManager.role,
    });

    adminToken = jwtService.sign({
      sub: testUsers.admin.id,
      email: testUsers.admin.email,
      role: testUsers.admin.role,
    });

    unauthorizedToken = jwtService.sign({
      sub: testUsers.unauthorized.id,
      email: testUsers.unauthorized.email,
      role: testUsers.unauthorized.role,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.message.deleteMany({});
    await prismaService.conversation.deleteMany({});
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [
            'user@test.com',
            'referral@test.com',
            'admin@test.com',
            'unauthorized@test.com',
          ],
        },
      },
    });

    await app.close();
  });

  describe('POST /api/v1/chat/conversations', () => {
    describe('USER role access control', () => {
      it('should allow USER to create conversation with admin (auto-assignment)', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.user1Id).toBe(testUsers.user.id);
            expect(res.body.data.user2Id).toBe(testUsers.admin.id);
          });
      });

      it('should allow USER to create conversation with specific admin', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .query({ targetUserId: testUsers.admin.id })
          .set('Authorization', `Bearer ${userToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
          });
      });

      it('should reject USER trying to chat with another user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .query({ targetUserId: testUsers.referralManager.id })
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Users and referral managers can only chat with admins',
            );
          });
      });
    });

    describe('REFERRAL_MANAGER role access control', () => {
      it('should allow REFERRAL_MANAGER to create conversation with admin (auto-assignment)', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .set('Authorization', `Bearer ${referralManagerToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.user1Id).toBe(testUsers.referralManager.id);
            expect(res.body.data.user2Id).toBe(testUsers.admin.id);
          });
      });

      it('should allow REFERRAL_MANAGER to create conversation with specific admin', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .query({ targetUserId: testUsers.admin.id })
          .set('Authorization', `Bearer ${referralManagerToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
          });
      });

      it('should reject REFERRAL_MANAGER trying to chat with regular user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .query({ targetUserId: testUsers.user.id })
          .set('Authorization', `Bearer ${referralManagerToken}`)
          .expect(403)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Users and referral managers can only chat with admins',
            );
          });
      });
    });

    describe('ADMIN role access control', () => {
      it('should allow ADMIN to create conversation with USER', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .query({ targetUserId: testUsers.user.id })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
          });
      });

      it('should allow ADMIN to create conversation with REFERRAL_MANAGER', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .query({ targetUserId: testUsers.referralManager.id })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
          });
      });

      it('should require target user ID for ADMIN', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Target user ID is required for admin users',
            );
          });
      });
    });

    describe('Unauthorized role access control', () => {
      it('should reject unauthorized role', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .set('Authorization', `Bearer ${unauthorizedToken}`)
          .expect(403)
          .expect((res) => {
            expect(res.body.message).toContain(
              'Only users, referral managers, and admins can use chat',
            );
          });
      });
    });

    describe('Authentication tests', () => {
      it('should reject requests without token', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .expect(401);
      });

      it('should reject requests with invalid token', () => {
        return request(app.getHttpServer())
          .post('/api/v1/chat/conversations')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });
  });

  describe('GET /api/v1/chat/conversations', () => {
    let userConversation: any;
    let referralManagerConversation: any;

    beforeAll(async () => {
      // Create test conversations
      userConversation = await prismaService.conversation.create({
        data: {
          user1Id: testUsers.user.id,
          user2Id: testUsers.admin.id,
        },
      });

      referralManagerConversation = await prismaService.conversation.create({
        data: {
          user1Id: testUsers.referralManager.id,
          user2Id: testUsers.admin.id,
        },
      });
    });

    it('should allow USER to view their conversations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should allow REFERRAL_MANAGER to view their conversations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${referralManagerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should allow ADMIN to view their conversations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should reject unauthorized role from viewing conversations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/chat/conversations/:id/messages', () => {
    let testConversation: any;

    beforeAll(async () => {
      testConversation = await prismaService.conversation.create({
        data: {
          user1Id: testUsers.user.id,
          user2Id: testUsers.admin.id,
        },
      });
    });

    it('should allow USER to send message in their conversation', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Test message from user',
          messageType: 'TEXT',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.content).toBe('Test message from user');
          expect(res.body.data.senderId).toBe(testUsers.user.id);
        });
    });

    it('should allow ADMIN to send message in conversation', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Test message from admin',
          messageType: 'TEXT',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.content).toBe('Test message from admin');
          expect(res.body.data.senderId).toBe(testUsers.admin.id);
        });
    });

    it('should reject REFERRAL_MANAGER from sending message in conversation they are not part of', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${referralManagerToken}`)
        .send({
          content: 'Unauthorized message',
          messageType: 'TEXT',
        })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Access denied to this conversation',
          );
        });
    });
  });

  describe('Admin-only endpoints', () => {
    describe('GET /api/v1/chat/admin/conversations', () => {
      it('should allow ADMIN to view all conversations', () => {
        return request(app.getHttpServer())
          .get('/api/v1/chat/admin/conversations')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
          });
      });

      it('should reject USER from viewing all conversations', () => {
        return request(app.getHttpServer())
          .get('/api/v1/chat/admin/conversations')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('should reject REFERRAL_MANAGER from viewing all conversations', () => {
        return request(app.getHttpServer())
          .get('/api/v1/chat/admin/conversations')
          .set('Authorization', `Bearer ${referralManagerToken}`)
          .expect(403);
      });
    });
  });
});
