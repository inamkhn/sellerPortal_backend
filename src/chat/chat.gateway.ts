import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
      role: string;
    };
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map to track user connections: userId -> Set of socket IDs
  private userSockets: Map<number, Set<string>> = new Map();

  constructor(private readonly chatService: ChatService) { }

  handleConnection(client: AuthenticatedSocket) {
    try {
      const user = client.data.user;

      if (!user || !user.id) {
        client.disconnect();
        return;
      }

      // Add socket to user's socket set
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)?.add(client.id);

      console.log(`User ${user.id} connected with socket ${client.id}`);

      // Emit connection success
      client.emit('connected', {
        message: 'Successfully connected to chat',
        userId: user.id,
      });
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    try {
      const user = client.data.user;

      if (user && user.id) {
        // Remove socket from user's socket set
        const sockets = this.userSockets.get(user.id);
        if (sockets) {
          sockets.delete(client.id);
          if (sockets.size === 0) {
            this.userSockets.delete(user.id);
          }
        }

        console.log(`User ${user.id} disconnected socket ${client.id}`);
      }
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const user = client.data.user;
      const { roomId } = data;

      // Validate user is participant in the room
      await this.chatService.validateChatRoomAccess(roomId, user.id);

      // Join the room
      const roomName = `room:${roomId}`;
      client.join(roomName);

      console.log(`User ${user.id} joined room ${roomId}`);

      // Emit confirmation
      client.emit('room_joined', {
        roomId,
        message: 'Successfully joined room',
      });
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Failed to join room',
      });
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { roomId: number; content: string; messageType?: string },
  ) {
    try {
      const user = client.data.user;
      const { roomId, content, messageType = 'TEXT' } = data;

      // Validate user is participant in the room
      await this.chatService.validateChatRoomAccess(roomId, user.id);

      // Send message via service
      const message = await this.chatService.sendMessage(
        roomId,
        user.id,
        content,
        messageType,
      );

      // Emit message_received event to all room participants
      this.emitToRoom(roomId, 'message_received', {
        message,
        roomId,
      });

      // Update message status to DELIVERED for online participants
      const onlineUsers = this.getOnlineUsersInRoom(roomId);
      if (onlineUsers.length > 1) {
        // At least one other user is online
        // Note: Message status update would be handled by the service
        console.log(
          `Message ${message.id} delivered to ${onlineUsers.length} users`,
        );
      }

      // Emit confirmation to sender
      client.emit('message_sent', {
        message,
        success: true,
      });
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const { roomId } = data;
      const roomName = `room:${roomId}`;

      void client.leave(roomName);

      console.log(`User ${client.data.user.id} left room ${roomId}`);

      // Emit confirmation
      client.emit('room_left', {
        roomId,
        message: 'Successfully left room',
      });
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Failed to leave room',
      });
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const user = client.data.user;
      const { roomId } = data;

      // Validate user is participant in the room
      await this.chatService.validateChatRoomAccess(roomId, user.id);

      // Emit typing_start to other participants in the room (exclude sender)
      client.to(`room:${roomId}`).emit('user_typing', {
        roomId,
        userId: user.id,
        userName: user.firstName || 'User',
        isTyping: true,
      });
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Failed to send typing indicator',
      });
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const user = client.data.user;
      const { roomId } = data;

      // Validate user is participant in the room
      await this.chatService.validateChatRoomAccess(roomId, user.id);

      // Emit typing_stop to other participants in the room (exclude sender)
      client.to(`room:${roomId}`).emit('user_typing', {
        roomId,
        userId: user.id,
        userName: user.firstName || 'User',
        isTyping: false,
      });
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Failed to send typing indicator',
      });
    }
  }

  @SubscribeMessage('message_read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    try {
      const user = client.data.user;
      const { roomId } = data;

      // Mark messages as read
      await this.chatService.markMessagesAsRead(roomId, user.id);

      // Emit message_status_updated to all participants in the room
      this.emitToRoom(roomId, 'message_status_updated', {
        roomId,
        userId: user.id,
        status: 'READ',
      });

      // Emit confirmation to sender
      client.emit('messages_marked_read', {
        roomId,
        success: true,
      });
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Failed to mark messages as read',
      });
    }
  }

  // Method to emit message to all participants in a room
  emitToRoom(roomId: number, event: string, data: any) {
    const roomName = `room:${roomId}`;
    this.server.to(roomName).emit(event, data);
  }

  // Method to check if user is online
  isUserOnline(userId: number): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  // Method to get all online users in a room
  getOnlineUsersInRoom(roomId: number): number[] {
    const roomName = `room:${roomId}`;
    const room = this.server.sockets.adapter.rooms.get(roomName);

    if (!room) {
      return [];
    }

    const onlineUserIds = new Set<number>();

    room.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket && socket.data.user) {
        onlineUserIds.add(socket.data.user.id);
      }
    });

    return Array.from(onlineUserIds);
  }
}
