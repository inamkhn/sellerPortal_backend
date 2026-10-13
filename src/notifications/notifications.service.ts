import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { NotificationsGateway } from './notifications/notifications.gateway';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  GetNotificationsDto,
} from './dto';
import { NotificationType, Role } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  // ============== CREATE NOTIFICATIONS ==============

  /**
   * Create a single notification and send it in real-time
   */
  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        actionUrl: dto.actionUrl,
        referenceId: dto.referenceId,
        metadata: dto.metadata,
      },
    });

    // Send real-time notification
    this.notificationsGateway.sendNotificationToUser(dto.userId, notification);

    // Update unread count
    const unreadCount = await this.getUnreadCount(dto.userId);
    this.notificationsGateway.sendUnreadCountUpdate(dto.userId, unreadCount);

    this.logger.log(
      `Created notification ${notification.id} for user ${dto.userId}`,
    );

    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(dto: CreateBulkNotificationDto) {
    const notifications = await Promise.all(
      dto.userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            type: dto.type,
            title: dto.title,
            message: dto.message,
            actionUrl: dto.actionUrl,
            referenceId: dto.referenceId,
            metadata: dto.metadata,
          },
        }),
      ),
    );

    // Send real-time notifications
    notifications.forEach((notification) => {
      this.notificationsGateway.sendNotificationToUser(
        notification.userId,
        notification,
      );
    });

    // Update unread counts
    for (const userId of dto.userIds) {
      const unreadCount = await this.getUnreadCount(userId);
      this.notificationsGateway.sendUnreadCountUpdate(userId, unreadCount);
    }

    this.logger.log(
      `Created ${notifications.length} notifications for ${dto.userIds.length} users`,
    );

    return {
      count: notifications.length,
      notifications,
    };
  }

  /**
   * Create notification for users by role
   */
  async createNotificationByRole(
    role: Role,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      actionUrl?: string;
      referenceId?: number;
      metadata?: Record<string, any>;
    },
  ) {
    // Get all users with the specified role
    const users = await this.prisma.user.findMany({
      where: { role },
      select: { id: true },
    });

    const userIds = users.map((user) => user.id);

    return this.createBulkNotifications({
      userIds,
      type,
      title,
      message,
      actionUrl: options?.actionUrl,
      referenceId: options?.referenceId,
      metadata: options?.metadata,
    });
  }

  /**
   * Create notification for all users except admins
   */
  async createNotificationForAllUsers(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      actionUrl?: string;
      referenceId?: number;
      metadata?: Record<string, any>;
      excludeAdmins?: boolean;
    },
  ) {
    const whereClause: { role?: { not: Role } } = {};

    if (options?.excludeAdmins !== false) {
      whereClause.role = { not: 'ADMIN' };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    const userIds = users.map((user) => user.id);

    return this.createBulkNotifications({
      userIds,
      type,
      title,
      message,
      actionUrl: options?.actionUrl,
      referenceId: options?.referenceId,
      metadata: options?.metadata,
    });
  }

  // ============== GET NOTIFICATIONS ==============

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(userId: number, filters: GetNotificationsDto) {
    const { page = 1, limit = 20, type, isRead } = filters;
    const skip = (page - 1) * limit;

    const whereClause: {
      userId: number;
      type?: NotificationType;
      isRead?: boolean;
    } = { userId };

    if (type) {
      whereClause.type = type;
    }

    if (isRead !== undefined) {
      whereClause.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: whereClause }),
    ]);

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // ============== UPDATE NOTIFICATIONS ==============

  /**
   * Mark notification as read
   */
  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Send real-time update
    this.notificationsGateway.notifyNotificationRead(userId, id);

    // Update unread count
    const unreadCount = await this.getUnreadCount(userId);
    this.notificationsGateway.sendUnreadCountUpdate(userId, unreadCount);

    return updated;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Send real-time update
    this.notificationsGateway.notifyAllNotificationsRead(userId);
    this.notificationsGateway.sendUnreadCountUpdate(userId, 0);

    return {
      count: result.count,
      message: `Marked ${result.count} notifications as read`,
    };
  }

  // ============== DELETE NOTIFICATIONS ==============

  /**
   * Delete a notification
   */
  async deleteNotification(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    // Update unread count if it was unread
    if (!notification.isRead) {
      const unreadCount = await this.getUnreadCount(userId);
      this.notificationsGateway.sendUnreadCountUpdate(userId, unreadCount);
    }

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  /**
   * Delete notifications by reference ID (useful when deleting related entities)
   */
  async deleteNotificationsByReference(referenceId: number) {
    const result = await this.prisma.notification.deleteMany({
      where: { referenceId },
    });

    this.logger.log(
      `Deleted ${result.count} notifications for reference ID ${referenceId}`,
    );

    return result;
  }
}
