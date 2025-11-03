import { User, Profile, Role } from '@prisma/client';

export interface UserStatistics {
  totalOrders: number;
  totalRevenue: number;
  successRate: number;
  pendingOrders: number;
  deliveredOrders: number;
}

export interface ReferralInfo {
  referralCode: string;
  totalReferrals: number;
  referralEarnings: number;
}

export interface UserDetailResponse extends User {
  profile: Profile | null;
  statistics: UserStatistics;
  referralInfo?: ReferralInfo;
}
