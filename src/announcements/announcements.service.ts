import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { AnnouncementPriority, Role } from '@prisma/client';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  GetAnnouncementsDto,
} from './dto';
import { NotificationsGateway } from '../notifications/notifications/notifications.gateway';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) { }

  /**
   * Create a new announcement and send notifications to all users except admin
   */
  async createAnnouncement(adminId: number, dto: CreateAnnouncementDto) {
    // Create the announcement
    const announcement = await this.prisma.announcement.create({
      data: {
        adminId,
        title: dto.title,
        message: dto.message,
        priority: dto.priority || AnnouncementPriority.NORMAL,
        targetRole: dto.targetRole || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Get all users except the admin who created the announcement
    const whereClause = {
      id: { not: adminId },
      ...(dto.targetRole && { role: dto.targetRole }),
    };

    const targetUsers = await this.prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    // Create notifications for all target users
    if (targetUsers.length > 0) {
      const notifications = await Promise.all(
        targetUsers.map((user) =>
          this.prisma.notification.create({
            data: {
              userId: user.id,
              type: 'ANNOUNCEMENT',
              title: announcement.title,
              message: announcement.message,
              referenceId: announcement.id,
              metadata: {
                priority: announcement.priority,
                announcementId: announcement.id,
              },
            },
          }),
        ),
      );

      // Send real-time notifications to all target users
      notifications.forEach((notification) => {
        this.notificationsGateway.sendNotificationToUser(
          notification.userId,
          notification,
        );
      });

      // Update unread counts for all users
      for (const user of targetUsers) {
        const unreadCount = await this.prisma.notification.count({
          where: {
            userId: user.id,
            isRead: false,
          },
        });
        this.notificationsGateway.sendUnreadCountUpdate(user.id, unreadCount);
      }
    }

    return {
      ...announcement,
      notificationsSent: targetUsers.length,
    };
  }

  /**
   * Create a system announcement without sending notifications
   */
  async createSystemAnnouncement(adminId: number, dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.announcement.create({
      data: {
        adminId,
        title: dto.title,
        message: dto.message,
        priority: dto.priority || AnnouncementPriority.NORMAL,
        targetRole: dto.targetRole || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return {
      ...announcement,
      notificationsSent: 0,
    };
  }

  /**
   * Get announcements for a specific user based on their role
   */
  async getAnnouncementsForUser(
    _userId: number,
    userRole: Role,
    filters: GetAnnouncementsDto,
  ) {
    const { page = 1, limit = 20, priority, isActive } = filters;

    const where = {
      isActive: isActive !== undefined ? isActive : true,
      AND: [
        {
          OR: [
            { targetRole: null }, // Announcements for all users
            { targetRole: userRole }, // Announcements for specific role
          ],
        },
        {
          title: { not: 'DISABLE_PAYOUT_WINDOWS' }, // Hide system internal announcements
        },
        {
          OR: [
            { expiresAt: null }, // No expiration
            { expiresAt: { gte: new Date() } }, // Not expired yet
          ],
        },
      ],
      ...(priority && { priority }),
    };

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        select: {
          id: true,
          title: true,
          message: true,
          priority: true,
          targetRole: true,
          createdAt: true,
          expiresAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all announcements (Admin only)
   */
  async getAllAnnouncements(filters: GetAnnouncementsDto) {
    const { page = 1, limit = 20, priority, isActive, title } = filters;

    const where = {
      ...(priority && { priority }),
      ...(isActive !== undefined && { isActive }),
      ...(title && { title }),
    };

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update an announcement
   */

  async updateAnnouncement(
    announcementId: number,
    _adminId: number,
    dto: UpdateAnnouncementDto,
  ) {
    // Check if announcement exists
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Update the announcement
    const updated = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.message && { message: dto.message }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.targetRole !== undefined && { targetRole: dto.targetRole }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
      },
    });

    return updated;
  }

  /**
   * Delete an announcement
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteAnnouncement(announcementId: number, _adminId: number) {
    // Check if announcement exists
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Delete the announcement
    await this.prisma.announcement.delete({
      where: { id: announcementId },
    });

    // Optionally delete related notifications
    await this.prisma.notification.deleteMany({
      where: {
        type: 'ANNOUNCEMENT',
        referenceId: announcementId,
      },
    });

    return { success: true, message: 'Announcement deleted successfully' };
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(announcementId: number) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }
}
