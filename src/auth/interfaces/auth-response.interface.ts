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
  };
  profile?: {
    verified: boolean;
  };
  referralInfo?: {
    wasReferred: boolean;
    referrerName?: string;
    userReferralCode: string;
  };
}

export interface TokenPayload {
  sub: number;
  email: string;
  role: Role;
  isVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
  iat?: number;
  exp?: number;
}
