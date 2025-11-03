import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Prisma } from '@prisma/client';
import {
  GetUsersQueryDto,
  UserListResponseDto,
  UpdateUserDto,
  UpdateRoleDto,
} from './dto';
import { UserDetailResponse, ReferralWithStats } from './interfaces';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated list of users with filtering and statistics
   */
  async getUsers(query: GetUsersQueryDto): Promise<UserListResponseDto> {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isVerified,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(isVerified !== undefined && { isVerified }),
      ...(dateFrom &&
        dateTo && {
          createdAt: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo),
          },
        }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          {
            profile: {
              fullName: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    // Fetch users and total count in parallel
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: {
            select: {
              fullName: true,
              whatsappNumber: true,
              referralCode: true,
            },
          },
          _count: {
            select: {
              orderRequests: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Calculate revenue for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const revenue = await this.prisma.orderRequest.aggregate({
          where: {
            userId: user.id,
            status: 'DELIVERED',
          },
          _sum: {
            decidedPrice: true,
          },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.profile?.fullName || null,
          avatar: user.avatar,
          role: user.role,
          isVerified: user.isVerified,
          whatsappNumber: user.profile?.whatsappNumber || null,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          totalOrders: user._count.orderRequests,
          totalRevenue: revenue._sum.decidedPrice?.toNumber() || 0,
        };
      }),
    );

    return {
      users: usersWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed user information with statistics
   */
  async getUserDetail(userId: number): Promise<UserDetailResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            referrer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get order statistics
    const [totalOrders, deliveredOrders, orderRevenue, pendingOrders] =
      await Promise.all([
        this.prisma.orderRequest.count({ where: { userId } }),
        this.prisma.orderRequest.count({
          where: { userId, status: 'DELIVERED' },
        }),
        this.prisma.orderRequest.aggregate({
          where: { userId, status: 'DELIVERED' },
          _sum: { decidedPrice: true },
        }),
        this.prisma.orderRequest.count({
          where: {
            userId,
            status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
          },
        }),
      ]);

    const statistics = {
      totalOrders,
      totalRevenue: orderRevenue._sum.decidedPrice?.toNumber() || 0,
      successRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
      pendingOrders,
      deliveredOrders,
    };

    // Get referral info if user is REFERRAL_MANAGER
    let referralInfo;
    if (user.role === 'REFERRAL_MANAGER') {
      const [totalReferrals, referralEarnings] = await Promise.all([
        this.prisma.referral.count({ where: { referrerId: userId } }),
        this.prisma.settlement.aggregate({
          where: {
            userId,
            settlementType: 'REFERRAL_PAYMENT',
            status: 'PAID',
          },
          _sum: { amount: true },
        }),
      ]);

      referralInfo = {
        referralCode: user.profile?.referralCode || '',
        totalReferrals,
        referralEarnings: referralEarnings._sum.amount?.toNumber() || 0,
      };
    }

    return {
      ...user,
      statistics,
      referralInfo,
    };
  }

  /**
   * Get user orders with pagination
   */
  async getUserOrders(userId: number, page = 1, limit = 20) {
    const [orders, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              photos: true,
              condition: true,
            },
          },
          customProducts: {
            select: {
              id: true,
              name: true,
              description: true,
              images: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.orderRequest.count({ where: { userId } }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user settlements with pagination
   */
  async getUserSettlements(userId: number, page = 1, limit = 20) {
    const [settlements, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where: { userId },
        include: {
          orderSettlement: {
            include: {
              orderRequest: {
                select: {
                  id: true,
                  customerName: true,
                  decidedPrice: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlement.count({ where: { userId } }),
    ]);

    return {
      settlements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user referrals with statistics
   */
  async getUserReferrals(userId: number): Promise<ReferralWithStats[]> {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          include: {
            profile: {
              select: {
                fullName: true,
              },
            },
            _count: {
              select: {
                orderRequests: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate revenue for each referral
    const referralsWithStats = await Promise.all(
      referrals.map(async (referral) => {
        const revenue = await this.prisma.orderRequest.aggregate({
          where: {
            userId: referral.refereeId,
            status: 'DELIVERED',
          },
          _sum: {
            decidedPrice: true,
          },
        });

        return {
          id: referral.id,
          referredUserId: referral.refereeId,
          referredUserName:
            referral.referee.profile?.fullName ||
            `${referral.referee.firstName || ''} ${referral.referee.lastName || ''}`.trim() ||
            referral.referee.email,
          referredUserEmail: referral.referee.email,
          registrationDate: referral.createdAt,
          orderCount: referral.referee._count.orderRequests,
          totalRevenue: revenue._sum.decidedPrice?.toNumber() || 0,
        };
      }),
    );

    return referralsWithStats;
  }

  /**
   * Update user information
   */
  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if email already exists (if email is being updated)
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      include: {
        profile: true,
      },
    });

    return updatedUser;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: number, updateRoleDto: UpdateRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If changing to REFERRAL_MANAGER and no referral code exists, generate one
    if (
      updateRoleDto.role === 'REFERRAL_MANAGER' &&
      (!user.profile || !user.profile.referralCode)
    ) {
      // Generate unique referral code
      const referralCode = await this.generateUniqueReferralCode();

      // Update or create profile with referral code
      if (user.profile) {
        await this.prisma.profile.update({
          where: { userId },
          data: { referralCode },
        });
      } else {
        await this.prisma.profile.create({
          data: {
            userId,
            referralCode,
          },
        });
      }
    }

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: updateRoleDto.role },
      include: { profile: true },
    });

    return updatedUser;
  }

  /**
   * Verify user account
   */
  async verifyUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user verification
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    // Update profile verification if profile exists
    if (user.profile) {
      await this.prisma.profile.update({
        where: { userId },
        data: { verified: true },
      });
    }

    return updatedUser;
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user (cascades to related records)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'User deleted successfully',
      userId,
    };
  }

  /**
   * Export users to CSV
   */
  async exportUsers(query: GetUsersQueryDto): Promise<string> {
    const { search, role, isVerified, dateFrom, dateTo } = query;

    // Build where clause (same as getUsers but without pagination)
    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(isVerified !== undefined && { isVerified }),
      ...(dateFrom &&
        dateTo && {
          createdAt: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo),
          },
        }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          {
            profile: {
              fullName: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    // Fetch all users matching filters
    const users = await this.prisma.user.findMany({
      where,
      include: {
        profile: {
          select: {
            fullName: true,
            whatsappNumber: true,
          },
        },
        _count: {
          select: {
            orderRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate revenue for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const revenue = await this.prisma.orderRequest.aggregate({
          where: {
            userId: user.id,
            status: 'DELIVERED',
          },
          _sum: {
            decidedPrice: true,
          },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          fullName: user.profile?.fullName || '',
          role: user.role,
          isVerified: user.isVerified,
          whatsappNumber: user.profile?.whatsappNumber || '',
          createdAt: this.formatDate(user.createdAt),
          lastLogin: user.lastLogin ? this.formatDate(user.lastLogin) : '',
          totalOrders: user._count.orderRequests,
          totalRevenue: (revenue._sum.decidedPrice?.toNumber() || 0).toFixed(2),
        };
      }),
    );

    // Generate CSV
    const headers = [
      'ID',
      'Email',
      'First Name',
      'Last Name',
      'Full Name',
      'Role',
      'Verified',
      'WhatsApp',
      'Created At',
      'Last Login',
      'Total Orders',
      'Total Revenue',
    ];

    const csvRows = [
      headers.join(','),
      ...usersWithStats.map((user) =>
        [
          user.id,
          `"${user.email}"`,
          `"${user.firstName}"`,
          `"${user.lastName}"`,
          `"${user.fullName}"`,
          user.role,
          user.isVerified,
          `"${user.whatsappNumber}"`,
          user.createdAt,
          user.lastLogin,
          user.totalOrders,
          user.totalRevenue,
        ].join(','),
      ),
    ];

    return csvRows.join('\n');
  }

  /**
   * Generate unique referral code
   */
  private async generateUniqueReferralCode(): Promise<string> {
    let referralCode = '';
    let isUnique = false;

    while (!isUnique) {
      // Generate random 8-character code
      referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Check if code already exists
      const existing = await this.prisma.profile.findUnique({
        where: { referralCode },
      });

      if (!existing) {
        isUnique = true;
      }
    }

    return referralCode;
  }

  /**
   * Format date as YYYY-MM-DD HH:mm:ss
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}
