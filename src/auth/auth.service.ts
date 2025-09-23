import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/database.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { RegisterDto, LoginDto } from './dto';
import {
  AuthResponse,
  TokenPayload,
  RefreshTokenPayload,
} from './interfaces/auth-response.interface';
import { GoogleUser } from './strategies/google.strategy';
import { EmailService } from '../common/services/email.service';
import {
  generateOTP,
  generateOTPExpiry,
  isOTPExpired,
  isValidOTPFormat,
} from '../common/utils/otp.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // Password hashing utilities
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // JWT token generation
  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshTokenId = uuidv4();
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenId: refreshTokenId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret:
        this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
        'refresh-secret',
      expiresIn: '7d',
    });

    // Store refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  }

  // User registration
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Generate email verification OTP
    const emailVerificationOtp = generateOTP(6);
    const emailVerificationExpiry = generateOTPExpiry(15); // 15 minutes

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerificationOtp,
        emailVerificationExpiry,
        isVerified: false,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        emailVerificationOtp,
        user.firstName || undefined,
      );
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send verification email:', error);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  }

  // User login
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.comparePasswords(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  }

  // Google OAuth registration/login
  async registerWithGoogle(googleUser: GoogleUser): Promise<AuthResponse> {
    const { email, firstName, lastName, picture } = googleUser;

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: email, // Using email as Google ID for simplicity
            avatar: picture,
            isVerified: true, // Google users are automatically verified
            lastLogin: new Date(),
          },
        });
      } else {
        // Just update last login
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
      }
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          googleId: email,
          avatar: picture,
          isVerified: true,
          password: null, // Google users don't have passwords
        },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  }

  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
          'refresh-secret',
      });

      // Find user and verify refresh token
      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
          refreshToken,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          isVerified: user.isVerified,
        },
        tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Logout
  async logout(userId: number, refreshToken: string): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId,
        refreshToken,
      },
      data: { refreshToken: null },
    });
  }

  // Email verification with OTP
  async verifyEmail(email: string, otp: string): Promise<void> {
    // Validate OTP format
    if (!isValidOTPFormat(otp, 6)) {
      throw new BadRequestException('Invalid OTP format');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.emailVerificationOtp) {
      throw new BadRequestException('No verification OTP found');
    }

    if (user.emailVerificationOtp !== otp) {
      throw new BadRequestException('Invalid verification OTP');
    }

    if (
      !user.emailVerificationExpiry ||
      isOTPExpired(user.emailVerificationExpiry)
    ) {
      throw new BadRequestException('Verification OTP has expired');
    }

    // Mark user as verified and clear verification OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationOtp: null,
        emailVerificationExpiry: null,
      },
    });
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification OTP
    const emailVerificationOtp = generateOTP(6);
    const emailVerificationExpiry = generateOTPExpiry(15); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp,
        emailVerificationExpiry,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        email,
        emailVerificationOtp,
        user.firstName || undefined,
      );
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to send verification email:', error);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  // Password reset functionality
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return;
    }

    // Generate password reset OTP
    const passwordResetOtp = generateOTP(6);
    const passwordResetExpiry = generateOTPExpiry(15); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOtp,
        passwordResetExpiry,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        email,
        passwordResetOtp,
        user.firstName || undefined,
      );
    } catch (error) {
      // Log error but don't fail the operation for security reasons
      console.error('Failed to send password reset email:', error);
    }
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    // Validate OTP format
    if (!isValidOTPFormat(otp, 6)) {
      throw new BadRequestException('Invalid OTP format');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.passwordResetOtp) {
      throw new BadRequestException('No password reset OTP found');
    }

    if (user.passwordResetOtp !== otp) {
      throw new BadRequestException('Invalid password reset OTP');
    }

    if (!user.passwordResetExpiry || isOTPExpired(user.passwordResetExpiry)) {
      throw new BadRequestException('Password reset OTP has expired');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and clear reset OTP, also invalidate all refresh tokens
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetOtp: null,
        passwordResetExpiry: null,
        refreshToken: null, // Invalidate all sessions
      },
    });

    // Send password reset confirmation email
    try {
      await this.emailService.sendPasswordResetConfirmation(
        user.email,
        user.firstName || undefined,
      );
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to send password reset confirmation email:', error);
    }
  }

  // Get user by ID (for JWT strategy)
  // async getUserById(id: number): Promise<User | null> {
  //   return this.prisma.user.findUnique({
  //     where: { id },
  //     include: { profile: true },
  //   });
  // }
}
