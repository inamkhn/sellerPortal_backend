import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/database.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let jwtService: JwtService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: ConfigService;

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
    refreshToken: null,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    passwordResetToken: null,
    passwordResetTokenExpiry: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should login user successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);
      const userWithHashedPassword = { ...mockUser, password: hashedPassword };

      mockPrismaService.user.findUnique.mockResolvedValue(
        userWithHashedPassword,
      );
      mockPrismaService.user.update.mockResolvedValue(userWithHashedPassword);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const userWithDifferentPassword = {
        ...mockUser,
        password: 'differentHashedPassword',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(
        userWithDifferentPassword,
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyEmail', () => {
    const token = 'valid-token';

    it('should verify email successfully with valid token', async () => {
      const userWithToken = {
        ...mockUser,
        emailVerificationToken: token,
        emailVerificationExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        isVerified: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithToken);
      mockPrismaService.user.update.mockResolvedValue({
        ...userWithToken,
        isVerified: true,
      });

      await expect(service.verifyEmail(token)).resolves.not.toThrow();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithToken.id },
        data: {
          isVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        emailVerificationToken: token,
        emailVerificationExpiry: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithExpiredToken);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refreshTokens', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh tokens successfully', async () => {
      const payload = { sub: 1, tokenId: 'token-id', iat: 123, exp: 456 };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshToken,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-token');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('resetPassword', () => {
    const token = 'reset-token';
    const newPassword = 'NewPassword123';

    it('should reset password successfully', async () => {
      const userWithResetToken = {
        ...mockUser,
        passwordResetToken: token,
        passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithResetToken);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await expect(
        service.resetPassword(token, newPassword),
      ).resolves.not.toThrow();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithResetToken.id },
        data: {
          password: expect.any(String) as string,
          passwordResetToken: null,
          passwordResetTokenExpiry: null,
          refreshToken: null,
        },
      });
    });

    it('should throw BadRequestException for invalid reset token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(typeof hashedPassword).toBe('string');
    });
  });

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await service.comparePasswords(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testPassword';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await service.comparePasswords(
        wrongPassword,
        hashedPassword,
      );
      expect(result).toBe(false);
    });
  });
});
