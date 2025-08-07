import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  lastName?: string;

  @ApiProperty({ enum: Role, example: Role.USER, description: 'User role' })
  role: Role;

  @ApiProperty({ example: true, description: 'Email verification status' })
  isVerified: boolean;
}

export class TokensResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (expires in 15 minutes)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (expires in 7 days)',
  })
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto, description: 'User information' })
  user: UserResponseDto;

  @ApiProperty({
    type: TokensResponseDto,
    description: 'Authentication tokens',
  })
  tokens: TokensResponseDto;
}
