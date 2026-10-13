import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { SettlementQueryDto } from './dto';
import { Prisma, SettlementStatus, SettlementType } from '@prisma/client';
import { EmailService } from '../common/services/email.service';
import { SendPayoutReminderDto } from './dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PAYOUT_REMINDER_JOB, PAYOUT_REMINDER_QUEUE } from './settlement.constants';

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @InjectQueue(PAYOUT_REMINDER_QUEUE)
    private readonly payoutReminderQueue: Queue,
  ) {}

  // ============== PAYOUT REQUEST HELPERS ==============

  /**
   * Check if current date is within payout window
   * Can be disabled by admin via announcement system
   */
  async isPayoutWindowActive(): Promise<boolean> {
    // Check if admin has disabled payout windows via announcement
    const disableAnnouncement = await this.prisma.announcement.findFirst({
      where: {
        title: 'DISABLE_PAYOUT_WINDOWS',
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });

    // If disabled announcement exists, return false
    if (disableAnnouncement) {
      return false;
    }

    // Otherwise, check date-based windows
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    // Month-end window: 30-31
    if (day === 30 || day === 31) {
      return true;
    }

    // First of month (for months with <31 days)
    if (day === 1) {
      // Check if previous month had fewer than 31 days
      const lastMonth = new Date(year, month - 1, 1);
      const daysInLastMonth = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0,
      ).getDate();
      return daysInLastMonth < 31;
    }

    return false;
  }

  /**
   * Calculate the next available payout date
   * Returns ISO string of next payout window start date
   */
  async getNextPayoutDate(): Promise<string> {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();

    // If currently in payout window, return current date
    if (await this.isPayoutWindowActive()) {
      return now.toISOString();
    }

    // Determine next payout date
    let nextDate: Date;

    if (day < 30) {
      // Next window is 30th of current month
      nextDate = new Date(year, month, 30);
    } else {
      // After 31st or between windows, next is 30th of next month
      nextDate = new Date(year, month + 1, 30);
    }

    return nextDate.toISOString();
  }

  /**
   * Calculate total pending settlement amount for a user
   * Includes SELLER_PAYMENT and REFERRAL_PAYMENT types only
   */
  async getPendingSettlementTotal(userId: number): Promise<number> {
    const result = await this.prisma.settlement.aggregate({
      where: {
        userId,
        status: SettlementStatus.PENDING,
        settlementType: {
          in: [SettlementType.SELLER_PAYMENT, SettlementType.REFERRAL_PAYMENT],
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  /**
   * Check if user has already requested payout today
   * Checks for payout request notifications created today
   */
  async hasRequestedPayoutToday(userId: number): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingRequest = await this.prisma.notification.findFirst({
      where: {
        type: 'SETTLEMENT_UPDATE',
        title: 'New Payout Request',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        metadata: {
          path: ['payoutRequest', 'userId'],
          equals: userId,
        },
      },
    });

    return !!existingRequest;
  }

  /**
   * Validate payout request
   * Checks: payout window, rate limit, pending amount, bank account
   */
  async validatePayoutRequest(userId: number): Promise<{
    valid: boolean;
    pendingAmount: number;
    profile: {
      bankAccount: string;
      accountNumber: string;
      fullName: string | null;
    };
  }> {
    // 1. Check payout window
    if (!(await this.isPayoutWindowActive())) {
      throw new BadRequestException(
        'Payout requests are only available on 30-31-1 of each month',
      );
    }

    // 2. Check rate limit (one per day)
    const hasRequested = await this.hasRequestedPayoutToday(userId);
    if (hasRequested) {
      throw new BadRequestException(
        'You have already submitted a payout request today. Please wait until tomorrow',
      );
    }

    // 3. Check pending amount
    const pendingAmount = await this.getPendingSettlementTotal(userId);
    if (pendingAmount <= 0) {
      throw new BadRequestException(
        'You have no pending settlements to request',
      );
    }

    // 4. Check bank account info
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        bankAccount: true,
        accountNumber: true,
        fullName: true,
      },
    });

    if (!profile?.bankAccount || !profile?.accountNumber) {
      throw new BadRequestException(
        'Please complete your bank account information in your profile',
      );
    }

    return {
      valid: true,
      pendingAmount,
      profile: {
        bankAccount: profile.bankAccount,
        accountNumber: profile.accountNumber,
        fullName: profile.fullName || '',
      },
    };
  }

  /**
   * Submit payout request
   * Creates notifications for all admin users
   */
  async requestPayout(
    userId: number,
    userName: string,
  ): Promise<{ amount: number; requestedAt: string }> {
    // Validate request
    const { pendingAmount, profile } = await this.validatePayoutRequest(userId);

    // Get all admin users
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    if (admins.length === 0) {
      throw new BadRequestException('No admin users found to process request');
    }

    // Mask account number (show last 4 digits)
    const maskedAccountNumber = profile.accountNumber
      ? `****${profile.accountNumber.slice(-4)}`
      : 'N/A';

    const requestedAt = new Date().toISOString();

    // Create notification for each admin
    const notificationPromises = admins.map((admin) =>
      this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SETTLEMENT_UPDATE',
          title: 'New Payout Request',
          message: `${profile.fullName || userName} has requested a payout of AED ${pendingAmount.toFixed(2)}`,
          actionUrl: '/admin-settlement',
          metadata: {
            payoutRequest: {
              userId,
              userName: profile.fullName || userName,
              amount: pendingAmount,
              bankAccount: {
                type: profile.bankAccount,
                accountNumber: maskedAccountNumber,
              },
              requestedAt,
            },
          },
        },
      }),
    );

    try {
      await Promise.all(notificationPromises);
    } catch {
      throw new BadRequestException(
        'Failed to submit payout request. Please try again',
      );
    }

    return {
      amount: pendingAmount,
      requestedAt,
    };
  }

  async findAll(userId: number, userRole: string, query: SettlementQueryDto) {
    const { status, settlementType, page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SettlementWhereInput = {};

    // Role-based filtering
    if (userRole === 'ADMIN') {
      // Admin can see all settlements
    } else if (userRole === 'REFERRAL_MANAGER') {
      // REFERRAL_MANAGER can see:
      // 1. Their own commissions (where they are the recipient)
      // 2. Settlements of users they referred
      const referredUsers = await this.prisma.user.findMany({
        where: {
          profile: {
            referredBy: userId,
          },
        },
        select: { id: true },
      });

      const referredUserIds = referredUsers.map((user) => user.id);

      where.userId = {
        in: [userId, ...referredUserIds],
      };
    } else {
      // USER can see only their own settlements
      where.userId = userId;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Settlement type filter
    if (settlementType) {
      where.settlementType = settlementType;
    }

    // Search filter (by user name or order details)
    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [settlements, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              profile: {
                select: {
                  fullName: true,
                  accountNumber: true,
                  bankAccount: true,
                  bankName: true,
                  accountTitle: true,
                  whatsappNumber: true,
                },
              },
            },
          },
          orderSettlement: {
            include: {
              orderRequest: {
                select: {
                  id: true,
                  decidedPrice: true,
                  status: true,
                  createdAt: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      profile: {
                        select: {
                          fullName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.settlement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format response with orderRequestId and user names
    const formattedSettlements = settlements.map((settlement) => ({
      ...settlement,
      orderRequestId: settlement.orderSettlement.orderRequest.id,
      userName:
        settlement.user.profile?.fullName ||
        `${settlement.user.firstName || ''} ${settlement.user.lastName || ''}`.trim() ||
        settlement.user.email,
      orderUserName:
        settlement.orderSettlement.orderRequest.user.profile?.fullName ||
        `${settlement.orderSettlement.orderRequest.user.firstName || ''} ${settlement.orderSettlement.orderRequest.user.lastName || ''}`.trim() ||
        settlement.orderSettlement.orderRequest.user.email,
    }));

    return {
      data: formattedSettlements,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async create(
    orderSettlementId: number,
    userId: number,
    settlementType: SettlementType,
    amount: number,
    requestingUserId: number,
    requestingUserRole: string,
    notes?: string,
    paymentProof?: string,
  ) {
    // Access control for referral managers
    if (requestingUserRole === 'REFERRAL_MANAGER') {
      // Referral manager can only create settlements for their referrals
      const referredUsers = await this.prisma.referral.findMany({
        where: { referrerId: requestingUserId },
        select: { refereeId: true },
      });
      const referredUserIds = referredUsers.map((r) => r.refereeId);

      // Check if the settlement is for the manager or their referrals
      if (userId !== requestingUserId && !referredUserIds.includes(userId)) {
        throw new BadRequestException(
          'Access denied: You can only create settlements for yourself or your referrals',
        );
      }
    }
    // Admin can create settlements for anyone (no additional check needed)
    return this.prisma.settlement.create({
      data: {
        orderSettlementId,
        userId,
        settlementType,
        amount,
        status: SettlementStatus.PENDING,
        notes,
        paymentProof,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                accountNumber: true,
                bankAccount: true,
                bankName: true,
                accountTitle: true,
                whatsappNumber: true,
              },
            },
          },
        },
        orderSettlement: {
          include: {
            orderRequest: {
              select: {
                id: true,
                decidedPrice: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: number,
    userId: number,
    userRole: string,
    data: {
      amount?: number;
      status?: SettlementStatus;
      paidAt?: Date;
      paymentProof?: string;
      notes?: string;
    },
  ) {
    // First, check if the settlement exists and get current status
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        amount: true,
        settlementType: true,
      },
    });

    if (!settlement) {
      throw new BadRequestException('Settlement not found');
    }

    // Access control logic
    if (userRole === 'ADMIN') {
      // Admin can update any settlement
    } else if (userRole === 'REFERRAL_MANAGER') {
      // Referral manager can only update settlements of their referrals
      const referredUsers = await this.prisma.referral.findMany({
        where: { referrerId: userId },
        select: { refereeId: true },
      });
      const referredUserIds = referredUsers.map((r) => r.refereeId);

      // Check if the settlement belongs to the manager or their referrals
      if (
        settlement.userId !== userId &&
        !referredUserIds.includes(settlement.userId)
      ) {
        throw new BadRequestException(
          'Access denied: You can only update settlements for yourself or your referrals',
        );
      }
    } else {
      throw new BadRequestException('Access denied: Insufficient permissions');
    }

    // Update the settlement
    const updatedSettlement = await this.prisma.settlement.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        orderSettlement: {
          include: {
            orderRequest: {
              select: {
                id: true,
                decidedPrice: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Send notification if status changed to PAID
    if (
      data.status === SettlementStatus.PAID &&
      settlement.status !== SettlementStatus.PAID
    ) {
      await this.notifyUserOnPayment(
        settlement.userId,
        Number(settlement.amount),
        settlement.settlementType,
        id,
      );
    }

    return updatedSettlement;
  }

  /**
   * Notify user when their settlement is marked as paid
   */
  private async notifyUserOnPayment(
    recipientUserId: number,
    amount: number,
    settlementType: SettlementType,
    settlementId: number,
  ) {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: recipientUserId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          profile: {
            select: {
              fullName: true,
            },
          },
        },
      });

      if (!user) return;

      // Determine notification message based on settlement type
      let title = 'Payment Received';
      let message = '';
      let actionUrl = '';

      if (settlementType === SettlementType.SELLER_PAYMENT) {
        title = 'Seller Payment Received';
        message = `Your seller payment of AED ${Number(amount).toFixed(2)} has been processed and marked as paid.`;
        actionUrl = '/settlements';
      } else if (settlementType === SettlementType.REFERRAL_PAYMENT) {
        title = 'Referral Commission Received';
        message = `Your referral commission of AED ${Number(amount).toFixed(2)} has been processed and marked as paid.`;
        actionUrl =
          user.role === 'REFERRAL_MANAGER'
            ? '/manager-payment'
            : '/settlements';
      } else if (settlementType === SettlementType.ADMIN_COMMISSION) {
        title = 'Commission Payment Received';
        message = `Your commission payment of AED ${Number(amount).toFixed(2)} has been processed and marked as paid.`;
        actionUrl = '/admin-settlement';
      }

      // Create in-app notification for the user
      await this.prisma.notification.create({
        data: {
          userId: recipientUserId,
          type: 'SETTLEMENT_UPDATE',
          title,
          message,
          actionUrl,
          metadata: {
            settlementId,
            amount: Number(amount),
            settlementType,
            paidAt: new Date().toISOString(),
          },
        },
      });

      // Send email notification only for non-admin users
      if (user.role !== 'ADMIN') {
        try {
          const userName =
            user.profile?.fullName ||
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.email;

          await this.emailService.sendSettlementPaymentEmail(
            user.email,
            userName,
            Number(amount),
            settlementType,
            settlementId,
          );
        } catch (emailError) {
          // Log email error but don't fail the notification process
          console.error('Failed to send settlement payment email:', emailError);
        }
      }
    } catch (error) {
      // Log error but don't fail the update operation
      console.error('Failed to send payment notification:', error);
    }
  }

  async getSettlementsGroupedByManager(query: SettlementQueryDto) {
    const { status } = query;

    // Get all referral managers
    const referralManagers = await this.prisma.user.findMany({
      where: { role: 'REFERRAL_MANAGER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // Get all referrals to map users to their managers
    const allReferrals = await this.prisma.referral.findMany({
      select: {
        referrerId: true,
        refereeId: true,
      },
    });

    // Create a map of userId -> managerId
    const userToManagerMap = new Map<number, number>();
    allReferrals.forEach((ref) => {
      userToManagerMap.set(ref.refereeId, ref.referrerId);
    });

    // Build where clause for settlements
    const settlementWhere: Prisma.SettlementWhereInput = {};
    if (status) {
      settlementWhere.status = status;
    }

    // Get all settlements
    const allSettlements = await this.prisma.settlement.findMany({
      where: settlementWhere,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            profile: {
              select: {
                fullName: true,
                accountNumber: true,
                bankAccount: true,
                whatsappNumber: true,
              },
            },
          },
        },
        orderSettlement: {
          include: {
            orderRequest: {
              select: {
                id: true,
                customerName: true,
                decidedPrice: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group settlements by manager
    const managerGroups = referralManagers.map((manager) => {
      const managerSettlements = allSettlements.filter(
        (s) =>
          s.userId === manager.id ||
          userToManagerMap.get(s.userId) === manager.id,
      );

      const totalPending = managerSettlements
        .filter((s) => s.status === SettlementStatus.PENDING)
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const totalPaid = managerSettlements
        .filter(
          (s) =>
            s.status === SettlementStatus.PAID &&
            (s.settlementType === SettlementType.SELLER_PAYMENT ||
              s.settlementType === SettlementType.REFERRAL_PAYMENT),
        )
        .reduce((sum, s) => sum + Number(s.amount), 0);

      return {
        managerId: manager.id,
        managerName:
          manager.profile?.fullName ||
          `${manager.firstName || ''} ${manager.lastName || ''}`.trim() ||
          manager.email,
        managerEmail: manager.email,
        totalPending,
        totalPaid,
        settlementCount: managerSettlements.length,
        settlements: managerSettlements.map((s) => ({
          ...s,
          orderRequestId: s.orderSettlement.orderRequest.id,
          userName:
            s.user.profile?.fullName ||
            `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() ||
            s.user.email,
        })),
      };
    });

    // Get direct users (not belonging to any REFERRAL_MANAGER and not managers themselves)
    const managerIds = new Set(referralManagers.map((m) => m.id));

    // Only get users referred by REFERRAL_MANAGER (not ADMIN)
    const usersReferredByManagers = new Set<number>();
    allReferrals.forEach((ref) => {
      // Check if the referrer is a REFERRAL_MANAGER
      const referrer = referralManagers.find((rm) => rm.id === ref.referrerId);
      if (referrer) {
        usersReferredByManagers.add(ref.refereeId);
      }
    });

    const directUserSettlements = allSettlements.filter((s) => {
      return (
        !managerIds.has(s.userId) && // Not a referral manager themselves
        !usersReferredByManagers.has(s.userId) && // Not referred by a REFERRAL_MANAGER
        s.user.role !== 'REFERRAL_MANAGER' // Not a referral manager role
      );
    });

    const directUsersTotalPending = directUserSettlements
      .filter((s) => s.status === SettlementStatus.PENDING)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const directUsersTotalPaid = directUserSettlements
      .filter(
        (s) =>
          s.status === SettlementStatus.PAID &&
          (s.settlementType === SettlementType.SELLER_PAYMENT ||
            s.settlementType === SettlementType.REFERRAL_PAYMENT),
      )
      .reduce((sum, s) => sum + Number(s.amount), 0);

    return {
      referralManagers: managerGroups,
      directUsers: {
        totalPending: directUsersTotalPending,
        totalPaid: directUsersTotalPaid,
        settlementCount: directUserSettlements.length,
        settlements: directUserSettlements.map((s) => ({
          ...s,
          orderRequestId: s.orderSettlement.orderRequest.id,
          userName:
            s.user.profile?.fullName ||
            `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() ||
            s.user.email,
        })),
      },
      summary: {
        totalManagers: referralManagers.length,
        totalDirectUsers: new Set(directUserSettlements.map((s) => s.userId))
          .size,
        totalPending:
          managerGroups.reduce((sum, g) => sum + g.totalPending, 0) +
          directUsersTotalPending,
        totalPaid:
          managerGroups.reduce((sum, g) => sum + g.totalPaid, 0) +
          directUsersTotalPaid,
      },
    };
  }

  async getCommissionHistory(
    referralManagerId: number,
    query: SettlementQueryDto,
  ) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SettlementWhereInput = {
      userId: referralManagerId,
      settlementType: SettlementType.REFERRAL_PAYMENT,
    };

    // Status filter
    if (status) {
      where.status = status;
    }

    const [settlements, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderSettlement: {
            include: {
              orderRequest: {
                select: {
                  id: true,
                  decidedPrice: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                      profile: {
                        select: {
                          fullName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.settlement.count({ where }),
    ]);

    // Transform to commission history format
    const data = settlements.map((settlement) => {
      const orderSettlement = settlement.orderSettlement;
      const orderRequest = orderSettlement.orderRequest;
      const user = orderRequest.user;

      return {
        id: settlement.id,
        orderId: `ORD-${orderRequest.id}`,
        sellerName:
          user.profile?.fullName ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.email,
        orderAmount: Number(orderRequest.decidedPrice),
        commissionRate: orderSettlement.referralCommissionRate
          ? Number(orderSettlement.referralCommissionRate)
          : 0,
        commissionAmount: Number(settlement.amount),
        status:
          settlement.status === SettlementStatus.PAID
            ? 'PAID'
            : settlement.status === SettlementStatus.PENDING
              ? 'PENDING'
              : 'SET',
        setDate: orderSettlement.createdAt.toISOString(),
        paymentDate: settlement.paidAt ? settlement.paidAt.toISOString() : null,
        createdAt: settlement.createdAt.toISOString(),
      };
    });

    // Calculate stats
    const allSettlements = await this.prisma.settlement.findMany({
      where: {
        userId: referralManagerId,
        settlementType: SettlementType.REFERRAL_PAYMENT,
      },
      include: {
        orderSettlement: true,
      },
    });

    const totalCommission = allSettlements
      .filter((s) => s.status === SettlementStatus.PAID)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const rates = allSettlements
      .filter((s) => s.orderSettlement.referralCommissionRate)
      .map((s) => Number(s.orderSettlement.referralCommissionRate));

    const averageCommissionRate =
      rates.length > 0
        ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length
        : 0;

    const stats = {
      totalCommission,
      averageCommissionRate,
      topEarningPeriod: 'Current Month',
      topEarningAmount: totalCommission,
    };

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  async queuePayoutReminderForAllUsers(
    adminId: number,
    dto: SendPayoutReminderDto,
  ): Promise<{
    campaignKey: string;
    totalUsers: number;
    queuedCount: number;
    skippedCount: number;
  }> {
    const { campaignKey, subject, message, forceResend = false } = dto;

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profile: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    let queuedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const fullName =
        user.profile?.fullName ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        null;

      const jobId = `payout-reminder:${campaignKey}:${user.id}`;
      const existingJob = await this.payoutReminderQueue.getJob(jobId);

      if (existingJob) {
        skippedCount += 1;
        continue;
      }

      await this.payoutReminderQueue.add(
        PAYOUT_REMINDER_JOB,
        {
          userId: user.id,
          email: user.email,
          fullName,
          campaignKey,
          subject,
          message,
          forceResend,
          triggeredBy: adminId,
        },
        {
          jobId,
        },
      );
      queuedCount += 1;
    }

    return {
      campaignKey,
      totalUsers: users.length,
      queuedCount,
      skippedCount,
    };
  }
}
