import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Referral } from '@prisma/client';

export interface ReferralWithDetails extends Referral {
  referrer: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profile: {
      fullName: string | null;
      referralCode: string;
      verified: boolean;
    } | null;
  };
  referee?: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profile: {
      fullName: string | null;
      verified: boolean;
    } | null;
  };
}

export interface PaginatedReferrals {
  referrals: ReferralWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReferralInfo {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

export interface ReferralEarnings {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  earningsBreakdown: {
    refereeId: number;
    refereeName: string;
    totalEarned: number;
    pendingAmount: number;
    paidAmount: number;
    paymentsCount: number;
  }[];
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrers: number;
  totalReferralEarnings: number;
  averageReferralsPerUser: number;
  topReferrers: {
    userId: number;
    userName: string;
    referralCount: number;
    totalEarnings: number;
  }[];
}

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async applyReferralCode(
    userId: number,
    referralCode: string,
  ): Promise<ReferralWithDetails> {
    // Check if user already has a referrer
    const existingReferral = await this.prisma.referral.findFirst({
      where: { refereeId: userId },
    });

    if (existingReferral) {
      throw new BadRequestException('You already have a referrer');
    }

    // Find the referrer by referral code
    const referrerProfile = await this.prisma.profile.findUnique({
      where: { referralCode },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!referrerProfile) {
      throw new BadRequestException('Invalid referral code');
    }

    // Check if user is trying to refer themselves
    if (referrerProfile.userId === userId) {
      throw new BadRequestException('You cannot refer yourself');
    }

    // Create the referral relationship
    const referral = await this.prisma.referral.create({
      data: {
        referrerId: referrerProfile.userId,
        refereeId: userId,
      },
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                fullName: true,
                referralCode: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    // Update the referee's profile to link to referrer
    await this.prisma.profile.update({
      where: { userId },
      data: { referredBy: referrerProfile.userId },
    });

    return referral;
  }

  async getUserReferralInfo(userId: number): Promise<ReferralInfo> {
    // Get user's profile with referral code
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { referralCode: true },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Get referral statistics
    const [totalReferrals, activeReferrals, earningsData] = await Promise.all([
      this.prisma.referral.count({
        where: { referrerId: userId },
      }),
      this.prisma.referral.count({
        where: {
          referrerId: userId,
          referee: {
            profile: {
              verified: true,
            },
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: { referrerId: userId },
        _sum: {
          referrerShare: true,
        },
      }),
    ]);

    const [pendingEarnings] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          referrerId: userId,
          status: 'PENDING',
        },
        _sum: {
          referrerShare: true,
        },
      }),
    ]);

    return {
      referralCode: profile.referralCode,
      totalReferrals,
      activeReferrals,
      totalEarnings: Number(earningsData._sum.referrerShare) || 0,
      pendingEarnings: Number(pendingEarnings._sum.referrerShare) || 0,
    };
  }

  async getUserReferrals(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedReferrals> {
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  fullName: true,
                  referralCode: true,
                  verified: true,
                },
              },
            },
          },
          referee: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  fullName: true,
                  verified: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.referral.count({
        where: { referrerId: userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      referrals,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getReferralEarnings(userId: number): Promise<ReferralEarnings> {
    // Get all payments where user is the referrer
    const payments = await this.prisma.payment.findMany({
      where: { referrerId: userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    const totalEarnings = payments.reduce(
      (sum, payment) => sum + Number(payment.referrerShare || 0),
      0,
    );

    const pendingEarnings = payments
      .filter((payment) => payment.status === 'PENDING')
      .reduce((sum, payment) => sum + Number(payment.referrerShare || 0), 0);

    const paidEarnings = payments
      .filter((payment) => payment.status === 'PAID')
      .reduce((sum, payment) => sum + Number(payment.referrerShare || 0), 0);

    // Group earnings by referee with proper typing
    type EarningsData = {
      refereeId: number;
      refereeName: string;
      totalEarned: number;
      pendingAmount: number;
      paidAmount: number;
      paymentsCount: number;
    };

    const earningsMap = new Map<number, EarningsData>();
    payments.forEach((payment) => {
      const refereeId = payment.userId;
      const refereeName =
        payment.user.profile?.fullName ||
        `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() ||
        'Unknown User';

      if (!earningsMap.has(refereeId)) {
        earningsMap.set(refereeId, {
          refereeId,
          refereeName,
          totalEarned: 0,
          pendingAmount: 0,
          paidAmount: 0,
          paymentsCount: 0,
        });
      }

      const earnings = earningsMap.get(refereeId)!; // Non-null assertion since we just checked/set it
      const amount = Number(payment.referrerShare || 0);
      earnings.totalEarned += amount;
      earnings.paymentsCount += 1;

      if (payment.status === 'PENDING') {
        earnings.pendingAmount += amount;
      } else if (payment.status === 'PAID') {
        earnings.paidAmount += amount;
      }
    });

    return {
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      earningsBreakdown: Array.from(earningsMap.values()),
    };
  }

  async getReferralStats(): Promise<ReferralStats> {
    const [
      totalReferrals,
      activeReferrers,
      totalReferralEarningsResult,
      topReferrersData,
    ] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral
        .groupBy({
          by: ['referrerId'],
        })
        .then((groups) => groups.length),
      this.prisma.payment.aggregate({
        where: { referrerId: { not: null } },
        _sum: { referrerShare: true },
      }),
      this.prisma.referral.groupBy({
        by: ['referrerId'],
        _count: { referrerId: true },
        orderBy: { _count: { referrerId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get detailed info for top referrers
    const topReferrersWithDetails = await Promise.all(
      topReferrersData.map(async (referrer) => {
        const user = await this.prisma.user.findUnique({
          where: { id: referrer.referrerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        });

        const earnings = await this.prisma.payment.aggregate({
          where: { referrerId: referrer.referrerId },
          _sum: { referrerShare: true },
        });

        const userName =
          user?.profile?.fullName ||
          `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
          'Unknown User';

        return {
          userId: referrer.referrerId,
          userName,
          referralCount: referrer._count.referrerId,
          totalEarnings: Number(earnings._sum.referrerShare) || 0,
        };
      }),
    );

    const averageReferralsPerUser =
      activeReferrers > 0 ? totalReferrals / activeReferrers : 0;

    return {
      totalReferrals,
      activeReferrers,
      totalReferralEarnings:
        Number(totalReferralEarningsResult._sum.referrerShare) || 0,
      averageReferralsPerUser: Math.round(averageReferralsPerUser * 10) / 10,
      topReferrers: topReferrersWithDetails,
    };
  }

  async validateReferralCode(code: string): Promise<{
    valid: boolean;
    referrer?: {
      id: number;
      firstName: string | null;
      lastName: string | null;
      profile: {
        fullName: string | null;
        verified: boolean;
      } | null;
    };
    message?: string;
  }> {
    const profile = await this.prisma.profile.findUnique({
      where: { referralCode: code },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!profile) {
      return {
        valid: false,
        message: 'Referral code not found',
      };
    }

    return {
      valid: true,
      referrer: {
        id: profile.user.id,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        profile: {
          fullName: profile.fullName,
          verified: profile.verified,
        },
      },
    };
  }

  async getReferralById(id: number): Promise<ReferralWithDetails> {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                fullName: true,
                referralCode: true,
                verified: true,
              },
            },
          },
        },
        referee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                fullName: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return referral;
  }
}
