import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/database.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { RegisterDto, LoginDto } from './dto';
import {
  AuthResponse,
  TokenPayload,
} from './interfaces/auth-response.interface';
import { GoogleUser } from './strategies/google.strategy';
import { EmailService } from '../common/services/email.service';
import {
  generateOTP,
  generateOTPExpiry,
  isOTPExpired,
  isValidOTPFormat,
} from '../common/utils/otp.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
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
  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Generate access token with longer expiry since no refresh token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
    });

    return accessToken;
  }

  // User registration
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, referralCode } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate referral code (now required)
    if (!referralCode || !referralCode.trim()) {
      throw new BadRequestException(
        'Referral code is required for registration',
      );
    }

    const referrerProfile = await this.prisma.profile.findUnique({
      where: { referralCode: referralCode.trim() },
      include: { user: true },
    });

    if (!referrerProfile || !referrerProfile.user) {
      throw new BadRequestException(
        'Invalid referral code. Please check the code and try again.',
      );
    }

    const referrer = referrerProfile.user;

    // Additional validation: Check if referrer account is verified
    // Only verified users can refer others
    if (!referrer.isVerified) {
      throw new BadRequestException(
        'This referral code belongs to an unverified account and cannot be used.',
      );
    }

    // Check if referrer profile is verified
    // Any user (USER, ADMIN, REFERRAL_MANAGER) can refer others, but their profile must be verified
    if (!referrerProfile.verified) {
      throw new BadRequestException(
        'This referral code is not yet activated. The profile needs to be verified by an admin.',
      );
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

    // Create user profile with referral information
    const profileData = {
      userId: user.id,
      fullName: `${firstName || ''} ${lastName || ''}`.trim() || null,
      referralCode: await this.generateUniqueReferralCode(),
      verified: false,
      referredBy: referrer.id,
    };

    await this.prisma.profile.create({
      data: profileData,
    });

    // Create referral record (always required now)
    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: user.id,
      },
    });

    // Generate access token
    const accessToken = this.generateAccessToken(user);

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

    // Send notifications (non-blocking)
    setImmediate(() => {
      void (async () => {
        try {
          const userName = `${firstName} ${lastName}`.trim() || email;

          // 1. Notify all admins about new user registration
          await this.notificationsService.createNotificationByRole(
            'ADMIN',
            'SYSTEM',
            'New User Registration',
            `New user ${userName} (${email}) has registered using referral code from ${referrer.firstName} ${referrer.lastName}.`,
            {
              actionUrl: `/admin-users/${user.id}`,
              referenceId: user.id,
              metadata: {
                userId: user.id,
                email: user.email,
                wasReferred: true,
                referrerId: referrer.id,
              },
            },
          );

          // 2. Notify the referrer about new signup (only if not an admin)
          // Admins already receive notifications through the admin broadcast above
          if (referrer.role !== 'ADMIN') {
            await this.notificationsService.createNotification({
              userId: referrer.id,
              type: 'SYSTEM',
              title: 'New Referral Signup',
              message: `${userName} has signed up using your referral code! You may earn commissions from their orders.`,
              actionUrl: `/referrals/${referrer.id}`,
              referenceId: user.id,
              metadata: {
                newUserId: user.id,
                newUserEmail: email,
                newUserName: userName,
              },
            });
          }

          console.log(`Registration notifications sent for user ${user.id}`);
        } catch (error) {
          console.error(
            `Failed to send registration notifications for user ${user.id}`,
            error,
          );
        }
      })();
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens: {
        accessToken,
      },
      referralInfo: {
        wasReferred: true,
        referrerName:
          `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() ||
          referrer.email,
        userReferralCode: profileData.referralCode,
      },
    };
  }

  // Generate unique referral code
  private async generateUniqueReferralCode(): Promise<string> {
    let referralCode = '';
    let isUnique = false;

    while (!isUnique) {
      // Generate a random 8-character alphanumeric code
      referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Check if it's unique
      const existingProfile = await this.prisma.profile.findUnique({
        where: { referralCode },
      });

      if (!existingProfile) {
        isUnique = true;
      }
    }

    return referralCode;
  }

  // User login
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user with profile
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: {
          select: {
            verified: true,
          },
        },
      },
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

    // Generate access token
    const accessToken = this.generateAccessToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens: {
        accessToken,
      },
      profile: {
        verified: user.profile?.verified ?? false,
      },
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

    // Generate access token
    const accessToken = this.generateAccessToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens: {
        accessToken,
      },
    };
  }

  // Logout
  async logout(userId: number): Promise<void> {
    // Update last login to track logout activity
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });

    // Since we're using stateless JWT tokens, there's no server-side session to invalidate
    // This method is mainly for logging purposes and future extensibility
    // The client should discard the JWT token on their side
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

    // Update password and clear reset OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetOtp: null,
        passwordResetExpiry: null,
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

  //  /api/auth/me  getMe

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            fullName: true,
            whatsappNumber: true,
            referralCode: true,
            verified: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.profile,
      },
    };
  }

  // Get user by ID (for JWT strategy)
  // async getUserById(id: number): Promise<User | null> {
  //   return this.prisma.user.findUnique({
  //     where: { id },
  //     include: { profile: true },
  //   });
  // }
}
