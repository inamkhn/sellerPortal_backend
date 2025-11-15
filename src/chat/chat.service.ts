import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { UploadService } from '../upload/upload.service';
import { ChatRoomType, MessageType, OrderStatus } from '@prisma/client';

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
   * OPTIMIZED: Reduced includes and separate unread count query
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
            where: {
              userId: { not: userId }, // Only fetch other participants
            },
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
            select: {
              id: true,
              content: true,
              messageType: true,
              createdAt: true,
              senderId: true,
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

    // Get current user's participant data separately
    const userParticipants = await this.prisma.chatParticipant.findMany({
      where: {
        chatRoomId: { in: chatRooms.map((r) => r.id) },
        userId,
      },
      select: {
        chatRoomId: true,
        unreadCount: true,
      },
    });

    const unreadMap = new Map(
      userParticipants.map((p) => [p.chatRoomId, p.unreadCount]),
    );

    // Format response with pre-fetched data
    const formattedRooms = chatRooms.map((room) => {
      return {
        id: room.id,
        type: room.type,
        lastMessageAt: room.lastMessageAt,
        unreadCount: unreadMap.get(room.id) || 0,
        participants: room.participants.map((p) => p.user),
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
   * Send a message with file attachment and optional text content
   */
  async sendMessageWithFile(
    roomId: number,
    senderId: number,
    file: Express.Multer.File,
    content: string,
    messageType: string,
  ) {
    // Validate user is participant
    await this.validateChatRoomAccess(roomId, senderId);

    // Upload file using upload service (works for all file types)
    const uploadResult = await this.uploadService.uploadImage(file, 'chat');

    // Create message with file info and content
    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId,
        content: content || null,
        messageType: messageType as MessageType,
        fileUrl: uploadResult.secure_url,
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
   * OPTIMIZED: Reduced select fields and better indexing
   */
  async getMessages(
    roomId: number,
    userId: number,
    cursor?: number,
    limit: number = 50,
  ) {
    // Validate user is participant (cached check)
    await this.validateChatRoomAccess(roomId, userId);

    // Build query
    const where: any = {
      chatRoomId: roomId,
      isDeleted: false,
    };

    if (cursor) {
      where.id = { lt: cursor };
    }

    // Fetch messages with minimal fields
    const messages = await this.prisma.chatMessage.findMany({
      where,
      take: limit + 1, // Fetch one extra to check if there are more
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        messageType: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        status: true,
        createdAt: true,
        senderId: true,
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
   * OPTIMIZED: Reduced includes and improved sorting
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
            where: {
              userId: { not: adminId }, // Only fetch non-admin participants
            },
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
            select: {
              id: true,
              content: true,
              messageType: true,
              createdAt: true,
              senderId: true,
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

    // Get admin participant data separately for unread counts
    const adminParticipants = await this.prisma.chatParticipant.findMany({
      where: {
        chatRoomId: { in: chatRooms.map((r) => r.id) },
        userId: adminId,
      },
      select: {
        chatRoomId: true,
        unreadCount: true,
      },
    });

    const unreadMap = new Map(
      adminParticipants.map((p) => [p.chatRoomId, p.unreadCount]),
    );

    // Format response with pre-fetched data
    const formattedRooms = chatRooms.map((room) => {
      const userParticipant = room.participants[0]; // We filtered to only get non-admin participants

      return {
        id: room.id,
        type: room.type,
        lastMessageAt: room.lastMessageAt,
        unreadCount: unreadMap.get(room.id) || 0,
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
   * OPTIMIZED: Batch query for order stats to avoid N+1 problem
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

    // Build where clause to include both MANAGER_SUPPORT and ADMIN_SUPPORT rooms
    const where = {
      OR: [
        {
          // Manager's chats with referrals
          type: ChatRoomType.MANAGER_SUPPORT,
          referralId: { in: referralIds },
        },
        {
          // Manager's chat with admin
          type: ChatRoomType.ADMIN_SUPPORT,
          participants: {
            some: { userId: managerId },
          },
        },
      ],
    };

    const [chatRooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        include: {
          participants: {
            where: {
              userId: { not: managerId }, // Only fetch other participants
            },
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
            select: {
              id: true,
              content: true,
              messageType: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    // Get manager participant data separately (more efficient)
    const managerParticipants = await this.prisma.chatParticipant.findMany({
      where: {
        chatRoomId: { in: chatRooms.map((r) => r.id) },
        userId: managerId,
      },
      select: {
        chatRoomId: true,
        unreadCount: true,
      },
    });

    const unreadMap = new Map(
      managerParticipants.map((p) => [p.chatRoomId, p.unreadCount]),
    );

    // OPTIMIZATION: Batch fetch all order stats in one query
    const userIds = chatRooms
      .flatMap((room) => room.participants.map((p) => p.userId))
      .filter((id) => id !== managerId);

    const orderStatsMap = new Map();
    if (userIds.length > 0) {
      const orderStats = await this.prisma.orderRequest.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          status: OrderStatus.DELIVERED,
        },
        _count: { id: true },
        _sum: { decidedPrice: true },
      });

      orderStats.forEach((stat) => {
        orderStatsMap.set(stat.userId, {
          totalOrders: stat._count.id,
          totalRevenue: stat._sum.decidedPrice
            ? Number(stat._sum.decidedPrice)
            : 0,
        });
      });
    }

    // Format response with pre-fetched data
    const formattedRooms = chatRooms.map((room) => {
      const userParticipant = room.participants[0]; // We filtered to only get non-manager participants

      return {
        id: room.id,
        type: room.type,
        lastMessageAt: room.lastMessageAt,
        unreadCount: unreadMap.get(room.id) || 0,
        user: userParticipant?.user || null,
        lastMessage: room.messages[0] || null,
        referralStats: orderStatsMap.get(userParticipant?.userId) || {
          totalOrders: 0,
          totalRevenue: 0,
        },
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

  /**
   * Get all users for admin chat directory (Column 1)
   */
  async getAllUsersForAdmin(
    page: number = 1,
    limit: number = 50,
    search?: string,
    role?: string,
  ) {
    const where: any = {};

    // Filter by search query
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        {
          profile: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Filter by role
    if (role && role !== 'ALL') {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isVerified: true,
          createdAt: true,
          lastLogin: true,
          profile: {
            select: {
              fullName: true,
              whatsappNumber: true,
              verified: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ lastLogin: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin initiates chat with any user
   */
  async adminInitiateChat(adminId: number, userId: number) {
    // Check if chat room already exists
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.ADMIN_SUPPORT,
        AND: [
          {
            participants: {
              some: { userId: adminId },
            },
          },
          {
            participants: {
              some: { userId },
            },
          },
        ],
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
    });

    if (existingRoom) {
      // Format response to include user field
      const userParticipant = existingRoom.participants.find(
        (p) => p.userId !== adminId,
      );

      return {
        ...existingRoom,
        user: userParticipant?.user || null,
        lastMessage: existingRoom.messages[0] || null,
      };
    }

    // Create new admin support chat room
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: ChatRoomType.ADMIN_SUPPORT,
        participants: {
          create: [{ userId: adminId }, { userId }],
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
    });

    // Format response to include user field
    const userParticipant = newRoom.participants.find(
      (p) => p.userId !== adminId,
    );

    return {
      ...newRoom,
      user: userParticipant?.user || null,
      lastMessage: newRoom.messages[0] || null,
    };
  }

  /**
   * Get all referred users for manager chat directory (Column 1 for Manager)
   */
  async getReferredUsersForManager(
    managerId: number,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ) {
    // Get manager's referrals
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: managerId },
      select: { refereeId: true },
    });

    const referredUserIds = referrals.map((r) => r.refereeId);

    if (referredUserIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const where: any = {
      id: { in: referredUserIds },
    };

    // Filter by search query
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        {
          profile: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isVerified: true,
          createdAt: true,
          lastLogin: true,
          profile: {
            select: {
              fullName: true,
              whatsappNumber: true,
              verified: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ lastLogin: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Manager initiates chat with a referred user
   */
  async managerInitiateChat(managerId: number, userId: number) {
    // Verify referral relationship exists
    const referral = await this.prisma.referral.findFirst({
      where: {
        referrerId: managerId,
        refereeId: userId,
      },
    });

    if (!referral) {
      throw new ForbiddenException(
        'You can only chat with users you have referred',
      );
    }

    // Check if chat room already exists
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.MANAGER_SUPPORT,
        referralId: referral.id,
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
    });

    if (existingRoom) {
      return existingRoom;
    }

    // Create new manager support chat room
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: ChatRoomType.MANAGER_SUPPORT,
        referralId: referral.id,
        participants: {
          create: [{ userId: managerId }, { userId }],
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
    });

    return newRoom;
  }

  /**
   * Get or create manager's chat with admin (for Tab 1)
   */
  async getOrCreateManagerAdminChat(managerId: number) {
    // Check if manager already has a chat with any admin
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.ADMIN_SUPPORT,
        participants: {
          some: { userId: managerId },
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
                role: true,
              },
            },
          },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          where: { isDeleted: false },
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

    if (existingRoom) {
      return {
        ...existingRoom,
        messages: existingRoom.messages.reverse(), // Chronological order
      };
    }

    // Find any admin user
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      throw new NotFoundException('No admin available');
    }

    // Create new admin support chat room
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: ChatRoomType.ADMIN_SUPPORT,
        participants: {
          create: [{ userId: managerId }, { userId: admin.id }],
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
                role: true,
              },
            },
          },
        },
        messages: true,
      },
    });

    return newRoom;
  }

  /**
   * Get or create user's chat with admin (for normal users)
   */
  async getOrCreateUserAdminChat(userId: number) {
    // Check if user already has a chat with any admin
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.ADMIN_SUPPORT,
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
                role: true,
              },
            },
          },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          where: { isDeleted: false },
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

    if (existingRoom) {
      return {
        ...existingRoom,
        messages: existingRoom.messages.reverse(), // Chronological order
      };
    }

    // Find any admin user
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      throw new NotFoundException('No admin available');
    }

    // Create new admin support chat room
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: ChatRoomType.ADMIN_SUPPORT,
        participants: {
          create: [{ userId }, { userId: admin.id }],
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
                role: true,
              },
            },
          },
        },
        messages: true,
      },
    });

    return newRoom;
  }

  /**
   * Check if user has a referral manager
   */
  async checkUserHasReferralManager(userId: number) {
    const referral = await this.prisma.referral.findFirst({
      where: {
        refereeId: userId,
        referrer: {
          role: 'REFERRAL_MANAGER',
        },
      },
      include: {
        referrer: {
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

    if (!referral) {
      return {
        hasManager: false,
        manager: null,
      };
    }

    return {
      hasManager: true,
      manager: referral.referrer,
    };
  }

  /**
   * Get or create user's chat with their referral manager
   */
  async getOrCreateUserManagerChat(userId: number) {
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
      throw new NotFoundException(
        'You do not have a referral manager assigned',
      );
    }

    // Check if chat room already exists
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.MANAGER_SUPPORT,
        referralId: referral.id,
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
                role: true,
              },
            },
          },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          where: { isDeleted: false },
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

    if (existingRoom) {
      return {
        ...existingRoom,
        messages: existingRoom.messages.reverse(), // Chronological order
      };
    }

    // Create new manager support chat room
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: ChatRoomType.MANAGER_SUPPORT,
        referralId: referral.id,
        participants: {
          create: [{ userId }, { userId: referral.referrerId }],
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
                role: true,
              },
            },
          },
        },
        messages: true,
      },
    });

    return newRoom;
  }
}
