import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthResponse = {
    user: {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.USER,
      isVerified: true,
    },
    tokens: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    },
  };

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

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    registerWithGoogle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
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
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw ConflictException if user already exists', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should login user successfully', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // describe('refreshTokens', () => {
  //   const refreshToken = 'valid-refresh-token';

  //   it('should refresh tokens successfully', async () => {
  //     mockAuthService.refreshTokens.mockResolvedValue(mockAuthResponse);

  //     const result = await controller.refreshTokens(refreshToken);

  //     expect(result).toEqual(mockAuthResponse);
  //     expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(refreshToken);
  //   });

  //   it('should throw UnauthorizedException for invalid refresh token', async () => {
  //     mockAuthService.refreshTokens.mockRejectedValue(
  //       new UnauthorizedException('Invalid refresh token'),
  //     );

  //     await expect(controller.refreshTokens(refreshToken)).rejects.toThrow(
  //       UnauthorizedException,
  //     );
  //   });
  // });

  describe('logout', () => {
    const refreshToken = 'valid-refresh-token';

    it('should logout user successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(mockUser, refreshToken);

      expect(mockAuthService.logout).toHaveBeenCalledWith(
        mockUser.id,
        refreshToken,
      );
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto = { token: 'valid-token' };

    it('should verify email successfully', async () => {
      mockAuthService.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(
        verifyEmailDto.token,
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockAuthService.verifyEmail.mockRejectedValue(
        new BadRequestException('Invalid verification token'),
      );

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resendVerificationEmail', () => {
    const forgotPasswordDto = { email: 'test@example.com' };

    it('should resend verification email successfully', async () => {
      mockAuthService.resendVerificationEmail.mockResolvedValue(undefined);

      const result =
        await controller.resendVerificationEmail(forgotPasswordDto);

      expect(result).toEqual({
        message: 'Verification email sent successfully',
      });
      expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
    });
  });

  describe('requestPasswordReset', () => {
    const forgotPasswordDto = { email: 'test@example.com' };

    it('should request password reset successfully', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.requestPasswordReset(forgotPasswordDto);

      expect(result).toEqual({
        message: 'Password reset email sent if account exists',
      });
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'NewPassword123',
    };

    it('should reset password successfully', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual({ message: 'Password reset successfully' });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
    });

    it('should throw BadRequestException for invalid reset token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid reset token'),
      );

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('googleAuthRedirect', () => {
    const mockRequest = {
      user: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        picture: 'https://example.com/photo.jpg',
        accessToken: 'google-access-token',
      },
    };

    it('should handle Google OAuth callback successfully', async () => {
      mockAuthService.registerWithGoogle.mockResolvedValue(mockAuthResponse);

      const result = await controller.googleAuthRedirect(mockRequest as any);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.registerWithGoogle).toHaveBeenCalledWith(
        mockRequest.user,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive data', () => {
      const result = controller.getProfile(mockUser);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
    });
  });
});
