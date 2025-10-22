import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ForgotPasswordDto,
  VerifyEmailDto,
} from './dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import { Public, GetUser } from './decorators';
import { User } from '@prisma/client';
import { GoogleUser } from './strategies/google.strategy';

@ApiTags('Authentication')
@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with email and password. Optionally accepts referral code. Sends email verification OTP.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            isVerified: { type: 'boolean', example: true },
          },
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        referralInfo: {
          type: 'object',
          properties: {
            wasReferred: { type: 'boolean', example: true },
            referrerName: { type: 'string', example: 'Admin User' },
            userReferralCode: { type: 'string', example: 'ABC12345' },
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'User with this email already exists',
        error: 'Conflict',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or referral code',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Please provide a valid email address',
          'Password must be at least 8 characters long',
          'Invalid referral code',
        ],
        error: 'Bad Request',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates user with email and password, returns access token',
  })
  @ApiOkResponse({
    description: 'User successfully logged in',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            isVerified: { type: 'boolean', example: true },
          },
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Please provide a valid email address',
          'Password is required',
        ],
        error: 'Bad Request',
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User logout',
    description:
      'Logs out the user. Since we use stateless JWT tokens, this endpoint is mainly for client-side cleanup and logging purposes.',
  })
  @ApiOkResponse({
    description: 'User successfully logged out',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async logout(@GetUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification',
    description: 'Resends email verification OTP to user email address',
  })
  @ApiOkResponse({
    description: 'Verification email sent successfully',
    schema: {
      example: {
        message: 'Verification email sent successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'User not found or email already verified',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email is already verified',
        error: 'Bad Request',
      },
    },
  })
  async resendVerificationEmail(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resendVerificationEmail(forgotPasswordDto.email);
    return { message: 'Verification email sent successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends password reset email to user if account exists',
  })
  @ApiOkResponse({
    description: 'Password reset email sent if account exists',
    schema: {
      example: {
        message: 'Password reset email sent if account exists',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format',
    schema: {
      example: {
        statusCode: 400,
        message: ['Please provide a valid email address'],
        error: 'Bad Request',
      },
    },
  })
  async requestPasswordReset(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
    return { message: 'Password reset email sent if account exists' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets user password using reset OTP from email',
  })
  @ApiOkResponse({
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password reset successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired reset OTP',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid reset OTP',
        error: 'Bad Request',
      },
    },
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otp,
      resetPasswordDto.newPassword,
    );
    return { message: 'Password reset successfully' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verifies user email address using 6-digit OTP sent via email',
  })
  @ApiOkResponse({
    description: 'Email successfully verified',
    schema: {
      example: {
        message: 'Email verified successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification OTP',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid verification OTP',
        error: 'Bad Request',
      },
    },
  })
  async verifyEmail(
    @Body() VerifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(
      VerifyEmailDto.email,
      VerifyEmailDto.otp,
    );
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth login',
    description: 'Initiates Google OAuth authentication flow',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  async googleAuth() {
    // This route initiates Google OAuth
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles Google OAuth callback and returns authentication tokens',
  })
  @ApiOkResponse({
    description: 'Google authentication successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            isVerified: { type: 'boolean', example: true },
          },
        },
        tokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Google authentication failed',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication failed',
        error: 'Unauthorized',
      },
    },
  })
  async googleAuthRedirect(@Req() req: Request): Promise<AuthResponse> {
    return this.authService.registerWithGoogle(req.user as GoogleUser);
  }

  // /api/auth/me

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns information about the authenticated user with profile',
  })
  @ApiOkResponse({
    description: 'User information retrieved successfully',
    schema: {
      example: {
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ADMIN',
          isVerified: true,
          avatar: null,
          profile: {
            fullName: 'John Doe',
            whatsappNumber: '+971501234567',
            referralCode: 'ABC12345',
            verified: true,
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async getMe(@GetUser() user: User) {
    return await this.authService.getMe(user.id);
  }

  // @UseGuards(JwtAuthGuard)
  // @Get('profile')
  // @ApiBearerAuth()
  // @ApiOperation({
  //   summary: 'Get user profile',
  //   description: 'Returns authenticated user profile information',
  // })
  // @ApiOkResponse({
  //   description: 'User profile retrieved successfully',
  //   schema: {
  //     example: {
  //       id: 1,
  //       email: 'user@example.com',
  //       firstName: 'John',
  //       lastName: 'Doe',
  //       role: 'USER',
  //       isVerified: true,
  //       avatar: null,
  //       googleId: null,
  //       lastLogin: '2024-01-15T10:30:00.000Z',
  //       createdAt: '2024-01-01T00:00:00.000Z',
  //       updatedAt: '2024-01-15T10:30:00.000Z',
  //     },
  //   },
  // })
  // @ApiUnauthorizedResponse({
  //   description: 'Invalid or missing access token',
  //   schema: {
  //     example: {
  //       statusCode: 401,
  //       message: 'Unauthorized',
  //       error: 'Unauthorized',
  //     },
  //   },
  // })
  // getProfile(@GetUser() user: User): Omit<User, 'password' | 'refreshToken'> {
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const { password, refreshToken, ...userProfile } = user;
  //   return userProfile;
  // }
}
