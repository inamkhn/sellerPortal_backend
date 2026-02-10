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
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
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
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers: Map<number, Set<string>> = new Map();
  private globalRoomId: number;

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly wsJwtGuard: WsJwtGuard,
  ) { }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate user using JWT guard
      const context = {
        switchToWs: () => ({
          getClient: () => client,
        }),
      };

      const canActivate = await this.wsJwtGuard.canActivate(context as any);
      if (!canActivate) {
        client.disconnect();
        return;
      }

      const user = client.data.user;

      // Get or create global chat
      const globalChat = await this.chatService.getOrCreateGlobalChat();
      this.globalRoomId = globalChat.id;

      // Ensure user is participant
      await this.chatService.ensureUserInGlobalChat(user.id);

      // Join global room
      client.join(`global-chat`);

      // Track online user
      if (!this.onlineUsers.has(user.id)) {
        this.onlineUsers.set(user.id, new Set());
      }
      this.onlineUsers.get(user.id)!.add(client.id);

      // Notify others user is online
      client.to('global-chat').emit('userOnline', {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });

      // Send current online users to the newly connected user
      const onlineUserIds = Array.from(this.onlineUsers.keys());
      client.emit('onlineUsers', onlineUserIds);

    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data?.user;
    if (!user) return;

    const userSockets = this.onlineUsers.get(user.id);
    if (userSockets) {
      userSockets.delete(client.id);

      if (userSockets.size === 0) {
        this.onlineUsers.delete(user.id);

        // Notify others user is offline
        client.to('global-chat').emit('userOffline', {
          userId: user.id,
        });
      }
    }
  }

  @SubscribeMessage('sendMessage')
  @UseGuards(WsJwtGuard)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { content: string; messageType?: string },
  ) {
    try {
      const user = client.data.user;

      const message = await this.chatService.sendGlobalMessage(
        user.id,
        data.content,
        data.messageType || 'TEXT',
      );

      // Broadcast to all users in global chat
      this.server.to('global-chat').emit('newMessage', message);

      return { success: true, message };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  @UseGuards(WsJwtGuard)
  handleTyping(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = client.data.user;

    client.to('global-chat').emit('userTyping', {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  @SubscribeMessage('stopTyping')
  @UseGuards(WsJwtGuard)
  handleStopTyping(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = client.data.user;

    client.to('global-chat').emit('userStoppedTyping', {
      userId: user.id,
    });
  }

  @SubscribeMessage('markAsRead')
  @UseGuards(WsJwtGuard)
  async handleMarkAsRead(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const user = client.data.user;
      await this.chatService.markMessagesAsRead(user.id);
      return { success: true };
    } catch (error) {
      console.error('Error marking as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Emit message to all users in global chat
  emitToGlobalChat(event: string, data: any) {
    this.server.to('global-chat').emit(event, data);
  }

  // Check if user is online
  isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  // Get count of online users
  getOnlineUsersCount(): number {
    return this.onlineUsers.size;
  }

  // Get all online user IDs
  getOnlineUserIds(): number[] {
    return Array.from(this.onlineUsers.keys());
  }
}
