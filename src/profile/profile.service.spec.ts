import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../database/database.service';
import { BankAccount } from '@prisma/client';

describe('ProfileService', () => {
  let service: ProfileService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    profile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    const createProfileDto = {
      fullName: 'John Doe',
      address: '123 Main Street',
      whatsappNumber: '+923001234567',
      bankAccount: BankAccount.EASYPAISA,
      accountNumber: '03001234567',
      facebookLink: 'https://facebook.com/johndoe',
      dubizzleLink: 'https://dubizzle.com/users/johndoe',
      referralCode: 'ABC12345',
    };

    it('should create a profile successfully', async () => {
      const userId = 1;
      const expectedProfile = {
        id: 1,
        userId,
        ...createProfileDto,
        verified: false,
        referredBy: undefined,
        user: {
          id: userId,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        },
      };

      mockPrismaService.profile.findUnique
        .mockResolvedValueOnce(null) // No existing profile
        .mockResolvedValueOnce(null); // No existing referral code

      mockPrismaService.profile.create.mockResolvedValue(expectedProfile);

      const result = await service.createProfile(userId, createProfileDto);

      expect(result).toEqual(expectedProfile);
      expect(mockPrismaService.profile.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.profile.create).toHaveBeenCalledWith({
        data: {
          userId,
          fullName: createProfileDto.fullName,
          address: createProfileDto.address,
          whatsappNumber: createProfileDto.whatsappNumber,
          bankAccount: createProfileDto.bankAccount,
          accountNumber: createProfileDto.accountNumber,
          facebookLink: createProfileDto.facebookLink,
          dubizzleLink: createProfileDto.dubizzleLink,
          referralCode: createProfileDto.referralCode,
          referredBy: undefined,
          verified: false,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });
    });

    it('should throw ConflictException if user already has a profile', async () => {
      const userId = 1;
      const existingProfile = { id: 1, userId };

      mockPrismaService.profile.findUnique.mockResolvedValue(existingProfile);

      await expect(
        service.createProfile(userId, createProfileDto),
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.profile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should throw ConflictException if referral code is already taken', async () => {
      const userId = 1;
      const existingReferralProfile = { id: 2, referralCode: 'ABC12345' };

      mockPrismaService.profile.findUnique
        .mockResolvedValueOnce(null) // No existing profile for user
        .mockResolvedValueOnce(existingReferralProfile); // Referral code exists

      await expect(
        service.createProfile(userId, createProfileDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userId = 1;
      const expectedProfile = {
        id: 1,
        userId,
        fullName: 'John Doe',
        user: { id: userId, email: 'user@example.com' },
      };

      mockPrismaService.profile.findUnique.mockResolvedValue(expectedProfile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(expectedProfile);
      expect(mockPrismaService.profile.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isVerified: true,
            },
          },
          referrer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should return null if profile not found', async () => {
      const userId = 1;

      mockPrismaService.profile.findUnique.mockResolvedValue(null);

      const result = await service.getProfile(userId);

      expect(result).toBeNull();
    });
  });

  describe('generateUniqueReferralCode', () => {
    it('should generate a unique 8-character referral code', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(null);

      const result = await service.generateUniqueReferralCode();

      expect(result).toHaveLength(8);
      expect(result).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should retry if referral code already exists', async () => {
      mockPrismaService.profile.findUnique
        .mockResolvedValueOnce({ id: 1, referralCode: 'EXISTING1' }) // First attempt exists
        .mockResolvedValueOnce(null); // Second attempt is unique

      const result = await service.generateUniqueReferralCode();

      expect(result).toHaveLength(8);
      expect(result).toMatch(/^[A-Z0-9]{8}$/);
      expect(mockPrismaService.profile.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
