import { Role } from '@prisma/client';

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    role: Role;
    isVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface TokenPayload {
  sub: number;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: number;
  tokenId: string;
  iat: number;
  exp: number;
}
