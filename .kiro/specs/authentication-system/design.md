# Design Document

## Overview

The authentication system will be built using NestJS with Passport.js for authentication strategies, JWT for token management, and bcryptjs for password hashing. The system integrates with the existing Prisma database schema and supports both traditional email/password authentication and Google OAuth. The design emphasizes security, scalability, and seamless integration with the existing user and profile models.

## Architecture

### Authentication Flow
- **Registration**: Email/password or Google OAuth → User creation → Email verification → JWT tokens
- **Login**: Credential validation → JWT token generation → User session establishment
- **Token Management**: Access tokens (15 min) + Refresh tokens (7 days) for secure session handling
- **Email Verification**: Token-based verification with expiration and resend capability
- **Password Reset**: Secure token-based password reset with email notifications

### Security Measures
- **Password Hashing**: bcryptjs with salt rounds for secure password storage
- **JWT Security**: Signed tokens with configurable expiration times
- **Token Rotation**: Refresh token rotation on each use for enhanced security
- **Rate Limiting**: Built-in throttling for authentication endpoints
- **Input Validation**: Comprehensive validation using class-validator

## Components and Interfaces

### Core Authentication Services

```typescript
interface AuthService {
  // Registration
  register(registerDto: RegisterDto): Promise<AuthResponse>
  registerWithGoogle(googleUser: GoogleUser): Promise<AuthResponse>
  
  // Login
  login(loginDto: LoginDto): Promise<AuthResponse>
  loginWithGoogle(googleUser: GoogleUser): Promise<AuthResponse>
  
  // Token Management
  refreshTokens(refreshToken: string): Promise<AuthResponse>
  logout(userId: number, refreshToken: string): Promise<void>
  
  // Email Verification
  sendVerificationEmail(userId: number): Promise<void>
  verifyEmail(token: string): Promise<void>
  
  // Password Reset
  requestPasswordReset(email: string): Promise<void>
  resetPassword(token: string, newPassword: string): Promise<void>
}

interface AuthResponse {
  user: {
    id: number
    email: string
    firstName?: string
    lastName?: string
    role: Role
    isVerified: boolean
  }
  tokens: {
    accessToken: string
    refreshToken: string
  }
}
```

### Authentication Strategies

```typescript
// JWT Strategy for protecting routes
class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService)
  async validate(payload: JwtPayload): Promise<User>
}

// Google OAuth Strategy
class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService)
  async validate(accessToken: string, refreshToken: string, profile: Profile): Promise<GoogleUser>
}
```

### Guards and Decorators

```typescript
// JWT Authentication Guard
@Injectable()
class JwtAuthGuard extends AuthGuard('jwt') {}

// Google OAuth Guard
@Injectable()
class GoogleAuthGuard extends AuthGuard('google') {}

// Role-based Authorization Guard
@Injectable()
class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean
}

// Custom Decorators
@SetMetadata('roles', roles)
const Roles = (...roles: Role[]) => SetMetadata('roles', roles)

const GetUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => User)
```

## Data Models

### DTOs and Validation

```typescript
class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string

  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string
}

class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  password: string
}

class ResetPasswordDto {
  @IsString()
  token: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  newPassword: string
}
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: number // User ID
  email: string
  role: Role
  iat: number
  exp: number
}

interface RefreshTokenPayload {
  sub: number
  tokenId: string
  iat: number
  exp: number
}
```

## Error Handling

### Authentication Errors
- **Invalid Credentials**: 401 Unauthorized with clear error message
- **Account Not Found**: 404 Not Found for non-existent users
- **Email Already Exists**: 409 Conflict for duplicate registration
- **Token Expired**: 401 Unauthorized with token refresh instruction
- **Invalid Token**: 401 Unauthorized for malformed or invalid tokens

### Validation Errors
- **Email Format**: 400 Bad Request with validation details
- **Password Strength**: 400 Bad Request with password requirements
- **Missing Fields**: 400 Bad Request with required field information
- **Rate Limiting**: 429 Too Many Requests with retry information

### Email Service Errors
- **Email Send Failure**: Log error but don't expose to client
- **Invalid Email Token**: 400 Bad Request with clear message
- **Expired Email Token**: 400 Bad Request with resend option

## Testing Strategy

### Unit Testing
- **AuthService Methods**: Test all authentication flows with mocked dependencies
- **JWT Strategy**: Test token validation and user extraction
- **Google Strategy**: Test OAuth profile processing
- **Guards**: Test authorization logic and role checking
- **Password Utilities**: Test hashing and validation functions

### Integration Testing
- **Registration Flow**: End-to-end user registration with email verification
- **Login Flow**: Complete authentication process with token generation
- **Token Refresh**: Test token rotation and validation
- **Password Reset**: Full password reset workflow
- **Protected Routes**: Test route protection with various token states

### Security Testing
- **Password Hashing**: Verify bcrypt implementation and salt rounds
- **JWT Security**: Test token signing, expiration, and validation
- **Rate Limiting**: Verify throttling on authentication endpoints
- **Input Validation**: Test malicious input handling
- **Token Rotation**: Verify refresh token invalidation

## Implementation Details

### Environment Configuration
```typescript
// Required environment variables
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EMAIL_SERVICE_API_KEY=your-email-service-key
```

### Module Dependencies
- **@nestjs/jwt**: JWT token generation and validation
- **@nestjs/passport**: Authentication strategy framework
- **passport-jwt**: JWT authentication strategy
- **passport-google-oauth20**: Google OAuth strategy
- **bcryptjs**: Password hashing utility
- **class-validator**: Input validation decorators
- **class-transformer**: Data transformation utilities

### Database Integration
The authentication system leverages existing Prisma schema fields:
- **User.password**: Hashed password storage
- **User.googleId**: Google OAuth identifier
- **User.refreshToken**: Current refresh token
- **User.isVerified**: Email verification status
- **User.emailVerificationToken**: Email verification token
- **User.emailVerificationExpiry**: Token expiration timestamp
- **User.passwordResetToken**: Password reset token
- **User.passwordResetTokenExpiry**: Reset token expiration
- **User.lastLogin**: Last successful login timestamp

### API Endpoints Structure
```typescript
// Authentication routes
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/google
GET  /api/v1/auth/google/callback

// Email verification routes
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification

// Password reset routes
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password

// User profile routes (protected)
GET  /api/v1/auth/profile
PUT  /api/v1/auth/profile
```

### Token Management Strategy
- **Access Tokens**: Short-lived (15 minutes) for API access
- **Refresh Tokens**: Longer-lived (7 days) stored in database
- **Token Rotation**: New refresh token issued on each refresh
- **Token Cleanup**: Expired tokens removed via scheduled job
- **Multi-Device Support**: Separate refresh tokens per device/session