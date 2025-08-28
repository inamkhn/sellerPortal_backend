import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
// import { CreateMessageDto } from './dto/create-message.dto';
import { MessageType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: number;
      email: string;
      role: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  constructor(private chatService: ChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.log(
        `Client connected: ${client.id} - User: ${client.data.user?.email}`,
      );

      // Join user to their personal room for notifications
      await client.join(`user_${client.data.user.id}`);

      // Emit connection success
      client.emit('connected', {
        message: 'Connected to chat server',
        userId: client.data.user.id,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Connection error: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Client disconnected: ${client.id} - User: ${client.data.user?.email}`,
    );
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    try {
      // Verify user has access to this conversation
      await this.chatService.getConversationById(
        data.conversationId,
        client.data.user.id,
      );

      // Join conversation room
      await client.join(`conversation_${data.conversationId}`);

      this.logger.log(
        `User ${client.data.user.id} joined conversation ${data.conversationId}`,
      );

      client.emit('joined-conversation', {
        conversationId: data.conversationId,
        message: 'Successfully joined conversation',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Join conversation error: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to join conversation',
        error: errorMessage,
      });
    }
  }

  @SubscribeMessage('leave-conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    try {
      await client.leave(`conversation_${data.conversationId}`);

      this.logger.log(
        `User ${client.data.user.id} left conversation ${data.conversationId}`,
      );

      client.emit('left-conversation', {
        conversationId: data.conversationId,
        message: 'Successfully left conversation',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Leave conversation error: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to leave conversation',
        error: errorMessage,
      });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { conversationId: number; content: string; messageType?: string },
  ) {
    try {
      // Validate and convert messageType
      let messageType: MessageType = MessageType.TEXT;
      if (
        data.messageType &&
        Object.values(MessageType).includes(data.messageType as MessageType)
      ) {
        messageType = data.messageType as MessageType;
      }

      // Create message in database
      const message = await this.chatService.createMessage(
        data.conversationId,
        client.data.user.id,
        {
          content: data.content,
          messageType,
        },
      );

      // Broadcast message to all participants in the conversation
      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message-received', {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          attachmentUrl: message.attachmentUrl,
          isRead: message.isRead,
          createdAt: message.createdAt,
          sender: message.sender,
        });

      this.logger.log(
        `Message sent by user ${client.data.user.id} in conversation ${data.conversationId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Send message error: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to send message',
        error: errorMessage,
      });
    }
  }

  @SubscribeMessage('typing-start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    try {
      // Verify user has access to this conversation
      await this.chatService.getConversationById(
        data.conversationId,
        client.data.user.id,
      );

      // Broadcast typing indicator to other participants
      client.to(`conversation_${data.conversationId}`).emit('user-typing', {
        conversationId: data.conversationId,
        userId: client.data.user.id,
        userName:
          `${client.data.user.firstName || ''} ${client.data.user.lastName || ''}`.trim() ||
          client.data.user.email,
        isTyping: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Typing start error: ${errorMessage}`);
    }
  }

  @SubscribeMessage('typing-stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    try {
      // Verify user has access to this conversation
      await this.chatService.getConversationById(
        data.conversationId,
        client.data.user.id,
      );

      // Broadcast typing stop to other participants
      client.to(`conversation_${data.conversationId}`).emit('user-typing', {
        conversationId: data.conversationId,
        userId: client.data.user.id,
        userName:
          `${client.data.user.firstName || ''} ${client.data.user.lastName || ''}`.trim() ||
          client.data.user.email,
        isTyping: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Typing stop error: ${errorMessage}`);
    }
  }

  @SubscribeMessage('mark-messages-read')
  async handleMarkMessagesRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    try {
      // Mark messages as read in database
      const result = await this.chatService.markMessagesAsRead(
        data.conversationId,
        client.data.user.id,
      );

      // Broadcast read receipt to other participants
      client.to(`conversation_${data.conversationId}`).emit('messages-read', {
        conversationId: data.conversationId,
        readByUserId: client.data.user.id,
        readAt: new Date(),
        count: result.count,
      });

      client.emit('messages-marked-read', {
        conversationId: data.conversationId,
        count: result.count,
      });

      this.logger.log(
        `User ${client.data.user.id} marked ${result.count} messages as read in conversation ${data.conversationId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Mark messages read error: ${errorMessage}`);
      client.emit('error', {
        message: 'Failed to mark messages as read',
        error: errorMessage,
      });
    }
  }

  // Helper method to notify users about new conversations
  notifyNewConversation(
    userId: number,
    conversation: Record<string, unknown>,
  ): void {
    this.server.to(`user_${userId}`).emit('new-conversation', conversation);
  }

  // Helper method to notify about conversation updates
  notifyConversationUpdate(
    conversationId: number,
    update: Record<string, unknown>,
  ): void {
    this.server
      .to(`conversation_${conversationId}`)
      .emit('conversation-updated', update);
  }
}
