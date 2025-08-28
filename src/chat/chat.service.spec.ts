import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../database/database.service';
import { Role, MessageType } from '@prisma/client';

describe('ChatService', () => {
  let service: ChatService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateConversation', () => {
    const mockUser = { id: 1, role: Role.USER };
    const mockReferralManager = { id: 2, role: Role.REFERRAL_MANAGER };
    const mockAdmin = { id: 3, role: Role.ADMIN };
    const mockUnauthorizedUser = { id: 4, role: 'INVALID_ROLE' as Role };

    describe('USER role tests', () => {
      it('should create conversation with admin when no target specified', async () => {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);
        mockPrismaService.user.findFirst.mockResolvedValueOnce(mockAdmin);
        mockPrismaService.conversation.findUnique.mockResolvedValueOnce(null);
        mockPrismaService.conversation.create.mockResolvedValueOnce({
          id: 1,
          user1Id: 1,
          user2Id: 3,
          user1: mockUser,
          user2: mockAdmin,
        });

        const result = await service.findOrCreateConversation(1);

        expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
          where: { role: Role.ADMIN },
          select: { id: true },
        });
        expect(result.user1Id).toBe(1);
        expect(result.user2Id).toBe(3);
      });

      it('should create conversation with specified admin target', async () => {
        mockPrismaService.user.findUnique
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAdmin);
        mockPrismaService.conversation.findUnique.mockResolvedValueOnce(null);
        mockPrismaService.conversation.create.mockResolvedValueOnce({
          id: 1,
          user1Id: 1,
          user2Id: 3,
          user1: mockUser,
          user2: mockAdmin,
        });

        const result = await service.findOrCreateConversation(1, 3);

        expect(result.user1Id).toBe(1);
        expect(result.user2Id).toBe(3);
      });

      it('should throw error when trying to chat with non-admin user', async () => {
        const nonAdminUser = { id: 4, role: Role.USER };
        mockPrismaService.user.findUnique
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(nonAdminUser);

        await expect(service.findOrCreateConversation(1, 4)).rejects.toThrow(
          new ForbiddenException(
            'Users and referral managers can only chat with admins',
          ),
        );
      });

      it('should throw error when no admin is available', async () => {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);
        mockPrismaService.user.findFirst.mockResolvedValueOnce(null);

        await expect(service.findOrCreateConversation(1)).rejects.toThrow(
          new NotFoundException('No admin available'),
        );
      });
    });

    describe('REFERRAL_MANAGER role tests', () => {
      it('should create conversation with admin when no target specified', async () => {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(
          mockReferralManager,
        );
        mockPrismaService.user.findFirst.mockResolvedValueOnce(mockAdmin);
        mockPrismaService.conversation.findUnique.mockResolvedValueOnce(null);
        mockPrismaService.conversation.create.mockResolvedValueOnce({
          id: 1,
          user1Id: 2,
          user2Id: 3,
          user1: mockReferralManager,
          user2: mockAdmin,
        });

        const result = await service.findOrCreateConversation(2);

        expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
          where: { role: Role.ADMIN },
          select: { id: true },
        });
        expect(result.user1Id).toBe(2);
        expect(result.user2Id).toBe(3);
      });

      it('should create conversation with specified admin target', async () => {
        mockPrismaService.user.findUnique
          .mockResolvedValueOnce(mockReferralManager)
          .mockResolvedValueOnce(mockAdmin);
        mockPrismaService.conversation.findUnique.mockResolvedValueOnce(null);
        mockPrismaService.conversation.create.mockResolvedValueOnce({
          id: 1,
          user1Id: 2,
          user2Id: 3,
          user1: mockReferralManager,
          user2: mockAdmin,
        });

        const result = await service.findOrCreateConversation(2, 3);

        expect(result.user1Id).toBe(2);
        expect(result.user2Id).toBe(3);
      });

      it('should throw error when trying to chat with non-admin user', async () => {
        const nonAdminUser = { id: 4, role: Role.USER };
        mockPrismaService.user.findUnique
          .mockResolvedValueOnce(mockReferralManager)
          .mockResolvedValueOnce(nonAdminUser);

        await expect(service.findOrCreateConversation(2, 4)).rejects.toThrow(
          new ForbiddenException(
            'Users and referral managers can only chat with admins',
          ),
        );
      });

      it('should throw error when no admin is available', async () => {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(
          mockReferralManager,
        );
        mockPrismaService.user.findFirst.mockResolvedValueOnce(null);

        await expect(service.findOrCreateConversation(2)).rejects.toThrow(
          new NotFoundException('No admin available'),
        );
      });
    });

    describe('ADMIN role tests', () => {
      it('should create conversation with any user when target specified', async () => {
        mockPrismaService.user.findUnique
          .mockResolvedValueOnce(mockAdmin)
          .mockResolvedValueOnce(mockUser);
        mockPrismaService.conversation.findUnique.mockResolvedValueOnce(null);
        mockPrismaService.conversation.create.mockResolvedValueOnce({
          id: 1,
          user1Id: 1,
          user2Id: 3,
          user1: mockUser,
          user2: mockAdmin,
        });

        const result = await service.findOrCreateConversation(3, 1);

        expect(result.user1Id).toBe(1);
        expect(result.user2Id).toBe(3);
      });

      it('should create conversation with referral manager', async () => {
        mockPrismaService.user.findUnique
          .mockResolvedValueOnce(mockAdmin)
          .mockResolvedValueOnce(mockReferralManager);
        mockPrismaService.conversation.findUnique.mockResolvedValueOnce(null);
        mockPrismaService.conversation.create.mockResolvedValueOnce({
          id: 1,
          user1Id: 2,
          user2Id: 3,
          user1: mockReferralManager,
          user2: mockAdmin,
        });

        const result = await service.findOrCreateConversation(3, 2);

        expect(result.user1Id).toBe(2);
        expect(result.user2Id).toBe(3);
      });

      it('should throw error when no target user specified', async () => {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(mockAdmin);

        await expect(service.findOrCreateConversation(3)).rejects.toThrow(
          new BadRequestException('Target user ID is required for admin users'),
        );
      });

      it('should throw error when target user not found', async () => {
        mockPrismaService.user.findUnique
          .mockResolvedValueOnce(mockAdmin)
          .mockResolvedValueOnce(null);

        await expect(service.findOrCreateConversation(3, 999)).rejects.toThrow(
          new NotFoundException('Target user not found'),
        );
      });
    });

    describe('Unauthorized role tests', () => {
      it('should throw error for unauthorized role', async () => {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(
          mockUnauthorizedUser,
        );

        await expect(service.findOrCreateConversation(4)).rejects.toThrow(
          new ForbiddenException(
            'Only users, referral managers, and admins can use chat',
          ),
        );
      });
    });

    describe('User not found tests', () => {
      it('should throw error when user not found', async () => {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

        await expect(service.findOrCreateConversation(999)).rejects.toThrow(
          new NotFoundException('User not found'),
        );
      });
    });

    describe('Existing conversation tests', () => {
      it('should return existing conversation instead of creating new one', async () => {
        const existingConversation = {
          id: 1,
          user1Id: 1,
          user2Id: 3,
          user1: mockUser,
          user2: mockAdmin,
        };

        mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);
        mockPrismaService.user.findFirst.mockResolvedValueOnce(mockAdmin);
        mockPrismaService.conversation.findUnique.mockResolvedValueOnce(
          existingConversation,
        );

        const result = await service.findOrCreateConversation(1);

        expect(result).toEqual(existingConversation);
        expect(mockPrismaService.conversation.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Helper methods', () => {
    describe('isRestrictedRole', () => {
      it('should return true for USER role', () => {
        // Access private method for testing
        const result = (service as any).isRestrictedRole(Role.USER);
        expect(result).toBe(true);
      });

      it('should return true for REFERRAL_MANAGER role', () => {
        const result = (service as any).isRestrictedRole(Role.REFERRAL_MANAGER);
        expect(result).toBe(true);
      });

      it('should return false for ADMIN role', () => {
        const result = (service as any).isRestrictedRole(Role.ADMIN);
        expect(result).toBe(false);
      });
    });

    describe('canInitiateConversation', () => {
      it('should allow USER to chat with ADMIN', () => {
        const result = (service as any).canInitiateConversation(
          Role.USER,
          Role.ADMIN,
        );
        expect(result).toBe(true);
      });

      it('should allow REFERRAL_MANAGER to chat with ADMIN', () => {
        const result = (service as any).canInitiateConversation(
          Role.REFERRAL_MANAGER,
          Role.ADMIN,
        );
        expect(result).toBe(true);
      });

      it('should not allow USER to chat with USER', () => {
        const result = (service as any).canInitiateConversation(
          Role.USER,
          Role.USER,
        );
        expect(result).toBe(false);
      });

      it('should not allow REFERRAL_MANAGER to chat with USER', () => {
        const result = (service as any).canInitiateConversation(
          Role.REFERRAL_MANAGER,
          Role.USER,
        );
        expect(result).toBe(false);
      });

      it('should allow ADMIN to chat with anyone', () => {
        expect(
          (service as any).canInitiateConversation(Role.ADMIN, Role.USER),
        ).toBe(true);
        expect(
          (service as any).canInitiateConversation(
            Role.ADMIN,
            Role.REFERRAL_MANAGER,
          ),
        ).toBe(true);
        expect(
          (service as any).canInitiateConversation(Role.ADMIN, Role.ADMIN),
        ).toBe(true);
      });

      it('should allow restricted roles without target (auto-assignment)', () => {
        expect((service as any).canInitiateConversation(Role.USER)).toBe(true);
        expect(
          (service as any).canInitiateConversation(Role.REFERRAL_MANAGER),
        ).toBe(true);
      });

      it('should not allow invalid roles', () => {
        const result = (service as any).canInitiateConversation(
          'INVALID_ROLE' as Role,
        );
        expect(result).toBe(false);
      });
    });
  });
});
