import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { User, Role, Prisma, BankAccount } from '@prisma/client';

export interface UserWithDetails {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  role: Role;
  isVerified: boolean;
  googleId: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    id: number;
    fullName: string | null;
    address: string | null;
    whatsappNumber: string | null;
    bankAccount: string | null;
    accountNumber: string | null;
    facebookLink: string | null;
    dubizzleLink: string | null;
    verified: boolean;
    referralCode: string;
    referredBy: number | null;
  } | null;
  _count?: {
    products: number;
    orderRequests: number;
    payments: number;
    referralsMade: number;
    referralsReceived: number;
  };
}

export interface PaginatedUsers {
  users: UserWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserQueryParams {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  isVerified?: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersLast30Days: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  usersByRole: Record<string, number>;
  usersWithOrders: number;
  usersWithProducts: number;
  googleAuthUsers: number;
  recentActivity: {
    last7Days: number;
    last30Days: number;
  };
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers(params: UserQueryParams): Promise<PaginatedUsers> {
    const { page, limit, search, role, isVerified, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    // Build order by clause
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isVerified: true,
          googleId: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              id: true,
              fullName: true,
              address: true,
              whatsappNumber: true,
              bankAccount: true,
              accountNumber: true,
              facebookLink: true,
              dubizzleLink: true,
              verified: true,
              referralCode: true,
              referredBy: true,
            },
          },
          _count: {
            select: {
              products: true,
              orderRequests: true,
              payments: true,
              referralsMade: true,
              referralsReceived: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getUserById(id: number): Promise<UserWithDetails> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isVerified: true,
        googleId: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            fullName: true,
            address: true,
            whatsappNumber: true,
            bankAccount: true,
            accountNumber: true,
            facebookLink: true,
            dubizzleLink: true,
            verified: true,
            referralCode: true,
            referredBy: true,
          },
        },
        _count: {
          select: {
            products: true,
            orderRequests: true,
            payments: true,
            referralsMade: true,
            referralsReceived: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(
    id: number,
    updateData: {
      firstName?: string;
      lastName?: string;
      role?: Role;
      isVerified?: boolean;
      avatar?: string;
    },
  ): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return updatedUser;
  }

  async suspendUser(id: number): Promise<{
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: Role;
    isVerified: boolean;
    message: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Cannot suspend admin users');
    }

    if (!user.isVerified) {
      throw new BadRequestException('User is already suspended');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isVerified: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
      },
    });

    return {
      ...updatedUser,
      message: 'User has been suspended',
    };
  }

  async activateUser(id: number): Promise<{
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: Role;
    isVerified: boolean;
    message: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already active');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isVerified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
      },
    });

    return {
      ...updatedUser,
      message: 'User has been activated',
    };
  }

  async deleteUser(id: number, currentUserId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot delete admin users');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  getRoles(): { value: string; label: string }[] {
    // Create a mapping of enum values to display labels
    const roleLabels: Record<Role, string> = {
      [Role.USER]: 'User',
      [Role.ADMIN]: 'Admin',
      [Role.REFERRAL_MANAGER]: 'Referral Manager',
    };

    // Get all enum values and map them to the desired format
    const roles = Object.values(Role).map((role) => ({
      value: role,
      label: roleLabels[role],
    }));

    return roles;
  }

  getBankAccountTypes(): { value: string; label: string }[] {
    // Create a mapping of enum values to display labels
    const bankAccountLabels: Record<BankAccount, string> = {
      [BankAccount.EASYPAISA]: 'EasyPaisa',
      [BankAccount.JAZZCASH]: 'JazzCash',
      [BankAccount.BANK_ACCOUNT]: 'Bank Account',
      [BankAccount.OTHER]: 'Other',
    };

    // Get all enum values and map them to the desired format
    const bankAccounts = Object.values(BankAccount).map((bankAccount) => ({
      value: bankAccount,
      label: bankAccountLabels[bankAccount],
    }));

    return bankAccounts;
  }

  async getUserStats(): Promise<UserStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      newUsersLast30Days,
      newUsersLast7Days,
      usersByRole,
      usersWithOrders,
      usersWithProducts,
      googleAuthUsers,
      activeUsersWithRecentOrders,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Verified users
      this.prisma.user.count({
        where: { isVerified: true },
      }),

      // Unverified users
      this.prisma.user.count({
        where: { isVerified: false },
      }),

      // New users in last 30 days
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),

      // New users in last 7 days
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),

      // Users by role
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),

      // Users with orders
      this.prisma.user.count({
        where: {
          orderRequests: {
            some: {},
          },
        },
      }),

      // Users with products
      this.prisma.user.count({
        where: {
          products: {
            some: {},
          },
        },
      }),

      // Google auth users
      this.prisma.user.count({
        where: {
          googleId: {
            not: null,
          },
        },
      }),

      // Active users (users with order requests in the last month)
      this.prisma.user.count({
        where: {
          orderRequests: {
            some: {
              createdAt: {
                gte: oneMonthAgo,
              },
            },
          },
        },
      }),
    ]);

    // Process users by role
    const roleStats = usersByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalUsers,
      activeUsers: activeUsersWithRecentOrders,
      newUsersLast30Days,
      verifiedUsers,
      unverifiedUsers,
      usersByRole: roleStats,
      usersWithOrders,
      usersWithProducts,
      googleAuthUsers,
      recentActivity: {
        last7Days: newUsersLast7Days,
        last30Days: newUsersLast30Days,
      },
    };
  }
}
