import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Role, MessageType } from '@prisma/client';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a role is restricted (USER or REFERRAL_MANAGER)
   * These roles can only initiate conversations with admins
   */
  private isRestrictedRole(role: Role): boolean {
    return role === Role.USER || role === Role.REFERRAL_MANAGER;
  }

  /**
   * Validate if a user can initiate a conversation with a target user
   * @param userRole - The role of the user initiating the conversation
   * @param targetRole - The role of the target user (optional for restricted roles)
   * @returns true if conversation is allowed, false otherwise
   */
  private canInitiateConversation(userRole: Role, targetRole?: Role): boolean {
    // Restricted roles (USER, REFERRAL_MANAGER) can only chat with admins
    if (this.isRestrictedRole(userRole)) {
      return !targetRole || targetRole === Role.ADMIN;
    }

    // Admins can chat with anyone
    if (userRole === Role.ADMIN) {
      return true;
    }

    // Any other role is not allowed
    return false;
  }

  async findUserConversations(userId: number, query: ConversationQueryDto) {
    const { page = 1, limit = 20, includeArchived = false } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const whereClause = includeArchived
      ? {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        }
      : {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          isActive: true,
        };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: whereClause,
        include: {
          user1: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          },
          user2: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderId: { not: userId },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where: whereClause }),
    ]);

    const conversationsWithMetadata = conversations.map((conversation) => ({
      ...conversation,
      lastMessage: conversation.messages[0] || null,
      unreadCount: conversation._count.messages,
      messages: undefined,
      _count: undefined,
    }));

    return {
      conversations: conversationsWithMetadata,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOrCreateConversation(userId: number, targetUserId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate user role permissions
    if (!this.canInitiateConversation(user.role)) {
      throw new ForbiddenException(
        'Only users, referral managers, and admins can use chat',
      );
    }

    // Handle restricted roles (USER, REFERRAL_MANAGER)
    if (this.isRestrictedRole(user.role)) {
      // If no targetUserId provided, find any admin
      if (!targetUserId) {
        const admin = await this.prisma.user.findFirst({
          where: { role: Role.ADMIN },
          select: { id: true },
        });

        if (!admin) {
          throw new NotFoundException('No admin available');
        }

        targetUserId = admin.id;
      } else {
        // Verify target is an admin
        const targetUser = await this.prisma.user.findUnique({
          where: { id: targetUserId },
          select: { role: true },
        });

        if (!targetUser) {
          throw new NotFoundException('Target user not found');
        }

        if (!this.canInitiateConversation(user.role, targetUser.role)) {
          throw new ForbiddenException(
            'Users and referral managers can only chat with admins',
          );
        }
      }
    } else if (user.role === Role.ADMIN) {
      // Admins can chat with anyone, but targetUserId is required
      if (!targetUserId) {
        throw new BadRequestException(
          'Target user ID is required for admin users',
        );
      }

      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { role: true },
      });

      if (!targetUser) {
        throw new NotFoundException('Target user not found');
      }
    }

    // At this point, targetUserId is guaranteed to be defined
    if (!targetUserId) {
      throw new Error('Target user ID should be defined at this point');
    }

    // Ensure user1 is always the non-admin user for consistency
    const [user1Id, user2Id] =
      user.role === Role.ADMIN
        ? [targetUserId, userId]
        : [userId, targetUserId];

    // Try to find existing conversation
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
      include: {
        user1: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        user2: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Create new conversation if it doesn't exist
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          user1Id,
          user2Id,
        },
        include: {
          user1: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          },
          user2: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          },
        },
      });
    }

    return conversation;
  }

  async getConversationById(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        user2: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is participant in the conversation
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    return conversation;
  }

  async archiveConversation(conversationId: number, adminId: number) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can archive conversations');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isActive: false },
    });
  }

  async getAllConversations(adminId: number, query: ConversationQueryDto) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view all conversations');
    }

    const { page = 1, limit = 20, includeArchived = false } = query;
    const skip = (page - 1) * limit;

    const whereClause = includeArchived ? {} : { isActive: true };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: whereClause,
        include: {
          user1: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          },
          user2: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: {
                where: { isRead: false },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where: whereClause }),
    ]);

    const conversationsWithMetadata = conversations.map((conversation) => ({
      ...conversation,
      lastMessage: conversation.messages[0] || null,
      unreadCount: conversation._count.messages,
      messages: undefined,
      _count: undefined,
    }));

    return {
      conversations: conversationsWithMetadata,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversationMessages(
    conversationId: number,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    // Verify user has access to this conversation
    await this.getConversationById(conversationId, userId);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createMessage(
    conversationId: number,
    senderId: number,
    createMessageDto: CreateMessageDto,
  ) {
    // Verify user has access to this conversation
    await this.getConversationById(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: createMessageDto.content,
        messageType: createMessageDto.messageType || MessageType.TEXT,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Update conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async createImageMessage(
    conversationId: number,
    senderId: number,
    imageUrl: string,
    content?: string,
  ) {
    // Verify user has access to this conversation
    await this.getConversationById(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content || 'Image attachment',
        messageType: MessageType.IMAGE,
        attachmentUrl: imageUrl,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Update conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async markMessagesAsRead(conversationId: number, userId: number) {
    // Verify user has access to this conversation
    await this.getConversationById(conversationId, userId);

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId }, // Only mark messages from other users as read
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result;
  }
}
