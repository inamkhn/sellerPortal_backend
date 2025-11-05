import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { UploadService } from '../upload/upload.service';
import { ChatRoomType, MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Create or get existing chat room
   */
  async createOrGetChatRoom(
    userId: number,
    type: ChatRoomType,
    targetUserId?: number,
  ) {
    // For ADMIN_SUPPORT: Check if user already has a chat with any admin
    if (type === ChatRoomType.ADMIN_SUPPORT) {
      const existingRoom = await this.prisma.chatRoom.findFirst({
        where: {
          type: ChatRoomType.ADMIN_SUPPORT,
          participants: {
            some: { userId },
          },
        },
        include: {
          participants: true,
        },
      });

      if (existingRoom) {
        return existingRoom;
      }

      // Find any admin user
      const admin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (!admin) {
        throw new NotFoundException('No admin available');
      }

      // Create new admin support chat room
      return this.prisma.chatRoom.create({
        data: {
          type: ChatRoomType.ADMIN_SUPPORT,
          participants: {
            create: [{ userId }, { userId: admin.id }],
          },
        },
        include: {
          participants: true,
        },
      });
    }

    // For MANAGER_SUPPORT: Check if user has a referral manager
    if (type === ChatRoomType.MANAGER_SUPPORT) {
      // Find referral relationship
      const referral = await this.prisma.referral.findFirst({
        where: {
          refereeId: userId,
          referrer: {
            role: 'REFERRAL_MANAGER',
          },
        },
        include: {
          referrer: true,
        },
      });

      if (!referral) {
        throw new BadRequestException(
          'No referral manager assigned to this user',
        );
      }

      // Check if chat room already exists
      const existingRoom = await this.prisma.chatRoom.findFirst({
        where: {
          type: ChatRoomType.MANAGER_SUPPORT,
          referralId: referral.id,
        },
        include: {
          participants: true,
        },
      });

      if (existingRoom) {
        return existingRoom;
      }

      // Create new manager support chat room
      return this.prisma.chatRoom.create({
        data: {
          type: ChatRoomType.MANAGER_SUPPORT,
          referralId: referral.id,
          participants: {
            create: [{ userId }, { userId: referral.referrerId }],
          },
        },
        include: {
          participants: true,
        },
      });
    }

    // For DIRECT: Check if chat exists between two users
    if (type === ChatRoomType.DIRECT && targetUserId) {
      const existingRoom = await this.prisma.chatRoom.findFirst({
        where: {
          type: ChatRoomType.DIRECT,
          AND: [
            {
              participants: {
                some: { userId },
              },
            },
            {
              participants: {
                some: { userId: targetUserId },
              },
            },
          ],
        },
        include: {
          participants: true,
        },
      });

      if (existingRoom) {
        return existingRoom;
      }

      // Create new direct chat room
      return this.prisma.chatRoom.create({
        data: {
          type: ChatRoomType.DIRECT,
          participants: {
            create: [{ userId }, { userId: targetUserId }],
          },
        },
        include: {
          participants: true,
        },
      });
    }

    throw new BadRequestException(
      'Invalid chat room type or missing targetUserId',
    );
  }

  /**
   * Get user's chat rooms with filters and pagination
   */
  async getUserChatRooms(
    userId: number,
    filters: {
      type?: ChatRoomType;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { type, search, page = 1, limit = 20 } = filters;

    // Build where clause
    const where: any = {
      participants: {
        some: { userId },
      },
    };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.participants = {
        some: {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    // Fetch chat rooms and total count
    const [chatRooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        include: {
          participants: {
            include: {
              user: {
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
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
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
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    // Format response with unread count for current user
    const formattedRooms = chatRooms.map((room) => {
      const currentUserParticipant = room.participants.find(
        (p) => p.userId === userId,
      );

      return {
        id: room.id,
        type: room.type,
        lastMessageAt: room.lastMessageAt,
        unreadCount: currentUserParticipant?.unreadCount || 0,
        participants: room.participants
          .filter((p) => p.userId !== userId)
          .map((p) => p.user),
        lastMessage: room.messages[0] || null,
        createdAt: room.createdAt,
      };
    });

    return {
      data: formattedRooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get chat room details with participants and recent messages
   */
  async getChatRoomDetails(roomId: number, userId: number) {
    // Validate user is a participant
    const isParticipant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId,
      },
    });

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this chat room',
      );
    }

    // Fetch chat room with details
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
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
        },
        messages: {
          where: { isDeleted: false },
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    return {
      ...chatRoom,
      messages: chatRoom.messages.reverse(), // Return in chronological order
    };
  }

  /**
   * Validate if user has access to chat room
   */
  async validateChatRoomAccess(
    roomId: number,
    userId: number,
  ): Promise<boolean> {
    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatRoomId: roomId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenException('You do not have access to this chat room');
    }

    return true;
  }

  /**
   * Validate referral relationship between manager and user
   */
  async validateReferralRelationship(
    managerId: number,
    userId: number,
  ): Promise<boolean> {
    const referral = await this.prisma.referral.findFirst({
      where: {
        referrerId: managerId,
        refereeId: userId,
      },
    });

    if (!referral) {
      throw new ForbiddenException('No referral relationship exists');
    }

    return true;
  }

  /**
   * Send a text message
   */
  async sendMessage(
    roomId: number,
    senderId: number,
    content: string,
    messageType: string = 'TEXT',
  ) {
    // Validate user is participant
    await this.validateChatRoomAccess(roomId, senderId);

    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId,
        content,
        messageType: messageType as MessageType,
        status: 'SENT',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update chat room lastMessageAt
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() },
    });

    // Increment unread count for all participants except sender
    await this.prisma.chatParticipant.updateMany({
      where: {
        chatRoomId: roomId,
        userId: { not: senderId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    return message;
  }

  /**
   * Send a media message with file
   */
  async sendMediaMessage(
    roomId: number,
    senderId: number,
    file: Express.Multer.File,
    messageType: string,
  ) {
    // Validate user is participant
    await this.validateChatRoomAccess(roomId, senderId);

    // File is already uploaded by multer, file.path contains the URL
    const fileUrl = file.path || `/uploads/chat/${roomId}/${file.filename}`;

    // Create message with file info
    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId,
        messageType: messageType as MessageType,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'SENT',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update chat room lastMessageAt
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() },
    });

    // Increment unread count for all participants except sender
    await this.prisma.chatParticipant.updateMany({
      where: {
        chatRoomId: roomId,
        userId: { not: senderId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    return message;
  }

  /**
   * Get messages with cursor-based pagination
   */
  async getMessages(
    roomId: number,
    userId: number,
    cursor?: number,
    limit: number = 50,
  ) {
    // Validate user is participant
    await this.validateChatRoomAccess(roomId, userId);

    // Build query
    const where: any = {
      chatRoomId: roomId,
      isDeleted: false,
    };

    if (cursor) {
      where.id = { lt: cursor };
    }

    // Fetch messages
    const messages = await this.prisma.chatMessage.findMany({
      where,
      take: limit + 1, // Fetch one extra to check if there are more
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Check if there are more messages
    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return {
      data: data.reverse(), // Return in chronological order
      hasMore,
      nextCursor,
    };
  }

  /**
   * Mark all messages in a room as read for a user
   */
  async markMessagesAsRead(roomId: number, userId: number) {
    // Validate user is participant
    await this.validateChatRoomAccess(roomId, userId);

    // Update participant unread count and lastReadAt
    await this.prisma.chatParticipant.updateMany({
      where: {
        chatRoomId: roomId,
        userId,
      },
      data: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });

    // Update message status to READ for messages sent by others
    await this.prisma.chatMessage.updateMany({
      where: {
        chatRoomId: roomId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: {
        status: 'READ',
      },
    });

    return { success: true };
  }

  /**
   * Soft delete a message (only sender can delete)
   */
  async softDeleteMessage(messageId: number, userId: number) {
    // Find message
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Validate user is the sender
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Get admin support chats with user details
   */
  async getAdminSupportChats(
    adminId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const where = {
      type: ChatRoomType.ADMIN_SUPPORT,
      participants: {
        some: { userId: adminId },
      },
    };

    const [chatRooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  role: true,
                  profile: {
                    select: {
                      fullName: true,
                      whatsappNumber: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
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
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { participants: { _count: 'desc' } }, // This won't work directly, we'll sort in memory
          { lastMessageAt: 'desc' },
        ],
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    // Format response with unread count
    const formattedRooms = chatRooms.map((room) => {
      const adminParticipant = room.participants.find(
        (p) => p.userId === adminId,
      );
      const userParticipant = room.participants.find(
        (p) => p.userId !== adminId,
      );

      return {
        id: room.id,
        type: room.type,
        lastMessageAt: room.lastMessageAt,
        unreadCount: adminParticipant?.unreadCount || 0,
        user: userParticipant?.user || null,
        lastMessage: room.messages[0] || null,
        createdAt: room.createdAt,
      };
    });

    // Sort by unread count desc, then lastMessageAt desc
    formattedRooms.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      return (
        (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0)
      );
    });

    return {
      data: formattedRooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get manager support chats with referral statistics
   */
  async getManagerSupportChats(
    managerId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    // Get manager's referrals
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: managerId },
      select: { id: true, refereeId: true },
    });

    const referralIds = referrals.map((r) => r.id);

    if (referralIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const where = {
      type: 'MANAGER_SUPPORT' as any,
      referralId: { in: referralIds },
    };

    const [chatRooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  profile: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    // Get referral statistics for each user
    const formattedRooms = await Promise.all(
      chatRooms.map(async (room) => {
        const managerParticipant = room.participants.find(
          (p) => p.userId === managerId,
        );
        const userParticipant = room.participants.find(
          (p) => p.userId !== managerId,
        );

        // Get order statistics for the referred user
        const orderStats = await this.prisma.orderRequest.aggregate({
          where: {
            userId: userParticipant?.userId,
            status: 'DELIVERED',
          },
          _count: { id: true },
          _sum: { decidedPrice: true },
        });

        return {
          id: room.id,
          type: room.type,
          lastMessageAt: room.lastMessageAt,
          unreadCount: managerParticipant?.unreadCount || 0,
          user: userParticipant?.user || null,
          lastMessage: room.messages[0] || null,
          referralStats: {
            totalOrders: orderStats._count.id,
            totalRevenue: orderStats._sum.decidedPrice?.toNumber() || 0,
          },
          createdAt: room.createdAt,
        };
      }),
    );

    return {
      data: formattedRooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search chat rooms by participant name
   */
  async searchChatRooms(
    userId: number,
    query: string,
    page: number = 1,
    limit: number = 100,
  ) {
    const chatRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    // Filter by participant name containing query
    const filtered = chatRooms.filter((room) => {
      return room.participants.some((p) => {
        if (p.userId === userId) return false; // Skip current user
        const user = p.user;
        const fullName =
          `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = user.email.toLowerCase();
        const searchQuery = query.toLowerCase();
        return fullName.includes(searchQuery) || email.includes(searchQuery);
      });
    });

    return filtered;
  }

  /**
   * Search messages by content
   */
  async searchMessages(userId: number, query: string, limit: number = 100) {
    // Get user's chat room IDs
    const userRooms = await this.prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatRoomId: true },
    });

    const roomIds = userRooms.map((r) => r.chatRoomId);

    if (roomIds.length === 0) {
      return [];
    }

    // Search messages
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        chatRoomId: { in: roomIds },
        isDeleted: false,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        chatRoom: {
          select: {
            id: true,
            type: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return messages;
  }
}
