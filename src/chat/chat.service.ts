import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { UploadService } from '../upload/upload.service';
import { MessageType } from '@prisma/client';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) { }

  // Get or create the global group chat
  async getOrCreateGlobalChat() {
    let globalChat = await this.prisma.groupChat.findFirst();

    if (!globalChat) {
      globalChat = await this.prisma.groupChat.create({
        data: {
          name: 'Global Chat',
          description: 'Community chat for all users',
          lastMessageAt: new Date(),
        },
      });
    }

    return globalChat;
  }

  // Ensure user is participant of global chat (auto-join)
  async ensureUserInGlobalChat(userId: number) {
    const globalChat = await this.getOrCreateGlobalChat();

    const existing = await this.prisma.groupParticipant.findUnique({
      where: {
        groupChatId_userId: {
          groupChatId: globalChat.id,
          userId: userId,
        },
      },
    });

    if (!existing) {
      await this.prisma.groupParticipant.create({
        data: {
          groupChatId: globalChat.id,
          userId: userId,
          joinedAt: new Date(),
        },
      });
    }

    return globalChat;
  }

  // Get global chat info with participant details
  async getGlobalChatInfo(userId: number) {
    const globalChat = await this.ensureUserInGlobalChat(userId);

    // Parallel queries for better performance
    const [participantCount, userParticipant] = await Promise.all([
      this.prisma.groupParticipant.count({
        where: { groupChatId: globalChat.id },
      }),
      this.prisma.groupParticipant.findUnique({
        where: {
          groupChatId_userId: {
            groupChatId: globalChat.id,
            userId: userId,
          },
        },
      }),
    ]);

    return {
      ...globalChat,
      participantCount,
      unreadCount: userParticipant?.unreadCount || 0,
      lastReadAt: userParticipant?.lastReadAt,
    };
  }

  // Get global chat messages with cursor-based pagination
  async getGlobalChatMessages(
    userId: number,
    cursor?: number,
    limit = 50,
  ) {
    const globalChat = await this.ensureUserInGlobalChat(userId);

    // Ensure limit is within bounds (defense in depth)
    const safeLimit = Math.min(Math.max(limit || 50, 1), 100);

    const messages = await this.prisma.groupMessage.findMany({
      where: {
        groupChatId: globalChat.id,
        isDeleted: false,
        ...(cursor && { id: { lt: cursor } }),
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            messageType: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit + 1,
    });

    const hasMore = messages.length > safeLimit;
    const batch = hasMore ? messages.slice(0, -1) : [...messages];
    const oldestMessage = batch[batch.length - 1]; // Before reversing, the last item is the oldest

    return {
      data: batch.reverse(), // Reverse to show oldest first
      hasMore,
      // Use the oldest message ID for the next cursor so we paginate backwards in time
      nextCursor: hasMore && oldestMessage ? oldestMessage.id : null,
    };
  }

  // Send message to global chat
  async sendGlobalMessage(
    userId: number,
    content: string,
    messageType: string = 'TEXT',
    replyToId?: number,
  ) {
    const globalChat = await this.ensureUserInGlobalChat(userId);

    // Validate replyToId if provided
    if (replyToId) {
      const replyToMessage = await this.prisma.groupMessage.findUnique({
        where: { id: replyToId },
      });

      if (!replyToMessage) {
        throw new NotFoundException(`Message with ID ${replyToId} not found`);
      }

      if (replyToMessage.groupChatId !== globalChat.id) {
        throw new BadRequestException(
          'Cannot reply to message from different chat',
        );
      }

      if (replyToMessage.isDeleted) {
        throw new BadRequestException('Cannot reply to deleted message');
      }
    }

    // Use transaction for data consistency and Promise.all for performance
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the message
      const message = await tx.groupMessage.create({
        data: {
          groupChatId: globalChat.id,
          senderId: userId,
          content,
          messageType: messageType as MessageType,
          replyToId,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              avatar: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              messageType: true,
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Run updates in parallel for better performance
      await Promise.all([
        // Update last message timestamp
        tx.groupChat.update({
          where: { id: globalChat.id },
          data: { lastMessageAt: new Date() },
        }),
        // Increment unread count for all other participants
        tx.groupParticipant.updateMany({
          where: {
            groupChatId: globalChat.id,
            userId: { not: userId },
          },
          data: {
            unreadCount: { increment: 1 },
          },
        }),
      ]);

      return message;
    });

    // Emit real-time event
    this.chatGateway.emitToGlobalChat('message_received', { message: result });

    return result;
  }

  // Helper method to determine message type from MIME type
  private getMessageTypeFromMime(mimetype: string): MessageType {
    if (mimetype.startsWith('image/')) {
      return MessageType.IMAGE;
    }
    if (mimetype.startsWith('video/')) {
      return MessageType.VIDEO;
    }
    if (
      mimetype === 'application/pdf' ||
      mimetype.includes('document') ||
      mimetype.includes('spreadsheet') ||
      mimetype.includes('presentation')
    ) {
      return MessageType.DOCUMENT;
    }
    return MessageType.FILE;
  }

  // Send message with file attachment
  async sendGlobalMessageWithFile(
    userId: number,
    file: Express.Multer.File,
    content?: string,
    replyToId?: number,
  ) {
    const globalChat = await this.ensureUserInGlobalChat(userId);

    // Determine message type from MIME type
    const messageType = this.getMessageTypeFromMime(file.mimetype);

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // Validate file type
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: images, videos, PDF, Word, Excel`,
      );
    }

    // Upload file to Cloudinary
    const uploadedFile = await this.uploadService.uploadImage(file, 'chat');

    // Use transaction for data consistency and Promise.all for performance
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the message with file
      const message = await tx.groupMessage.create({
        data: {
          groupChatId: globalChat.id,
          senderId: userId,
          content: content || null,
          messageType: messageType as MessageType,
          fileUrl: uploadedFile.secure_url,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          replyToId,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              avatar: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              messageType: true,
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Run updates in parallel for better performance
      await Promise.all([
        // Update last message timestamp
        tx.groupChat.update({
          where: { id: globalChat.id },
          data: { lastMessageAt: new Date() },
        }),
        // Increment unread count for all other participants
        tx.groupParticipant.updateMany({
          where: {
            groupChatId: globalChat.id,
            userId: { not: userId },
          },
          data: {
            unreadCount: { increment: 1 },
          },
        }),
      ]);

      return message;
    });

    // Emit real-time event
    this.chatGateway.emitToGlobalChat('message_received', { message: result });

    return result;
  }

  // Mark messages as read
  async markMessagesAsRead(userId: number) {
    const globalChat = await this.getOrCreateGlobalChat();

    await this.prisma.groupParticipant.update({
      where: {
        groupChatId_userId: {
          groupChatId: globalChat.id,
          userId: userId,
        },
      },
      data: {
        unreadCount: 0,
        lastReadAt: new Date(),
      },
    });

    return { success: true };
  }

  // Soft delete a message (only sender can delete)
  async deleteMessage(messageId: number, userId: number) {
    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (message.senderId !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own messages');
    }

    if (message.fileUrl) {
      // Extract public ID from URL
      const publicId = this.uploadService.extractPublicId(message.fileUrl);
      if (publicId) {
        // Delete from Cloudinary (don't block if fails)
        try {
          // If it's a video or raw file, resource_type needs to be specified for Cloudinary
          // The current uploadService.deleteImage assumes 'image' resource type by default
          // We might need to enhance deleteImage or just try deleting
          await this.uploadService.deleteImage(publicId);
        } catch (error) {
          console.error(`Failed to delete file for message ${messageId}:`, error);
          // Continue with message deletion even if file deletion fails
        }
      }
    }

    await this.prisma.groupMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        // Optional: Clear file fields to prevent access if soft deleted?
        // keeping them might be useful for history/debugging
        // fileUrl: null, 
      },
    });

    // Emit real-time event so frontend removes it from local state
    this.chatGateway.emitToGlobalChat('message_deleted', {
      messageId: messageId,
      groupChatId: message.groupChatId
    });

    return { success: true, message: 'Message deleted' };
  }

  // Toggle pin message (Admin only)
  async togglePinMessage(messageId: number, adminId: number) {
    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const updatedMessage = await this.prisma.groupMessage.update({
      where: { id: messageId },
      data: {
        isPinned: !message.isPinned,
        pinnedBy: !message.isPinned ? adminId : null,
        pinnedAt: !message.isPinned ? new Date() : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return updatedMessage;
  }

  // Get pinned messages
  async getPinnedMessages() {
    const globalChat = await this.getOrCreateGlobalChat();

    return this.prisma.groupMessage.findMany({
      where: {
        groupChatId: globalChat.id,
        isPinned: true,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true,
          },
        },
      },
      orderBy: { pinnedAt: 'desc' },
    });
  }

  // Add reaction to message
  async addReaction(messageId: number, userId: number, emoji: string) {
    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const reactions = (message.reactions as any) || {};

    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    await this.prisma.groupMessage.update({
      where: { id: messageId },
      data: { reactions },
    });

    return { success: true, reactions };
  }

  // Remove reaction from message
  async removeReaction(messageId: number, userId: number, emoji: string) {
    const message = await this.prisma.groupMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const reactions = (message.reactions as any) || {};

    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id: number) => id !== userId);

      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    await this.prisma.groupMessage.update({
      where: { id: messageId },
      data: { reactions },
    });

    return { success: true, reactions };
  }
}
