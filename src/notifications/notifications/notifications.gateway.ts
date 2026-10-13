import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Notification } from '@prisma/client';

interface SocketData {
  userId: number;
  role: string;
}

interface JwtPayload {
  sub: number;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<number, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const authHeader = client.handshake.headers.authorization;
      const token =
        client.handshake.auth.token ||
        (typeof authHeader === 'string'
          ? authHeader.replace('Bearer ', '')
          : undefined);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = payload.sub;

      // Store user's socket connection
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.add(client.id);
      }

      // Join user-specific room
      await client.join(`user:${userId}`);

      // Join role-specific room
      if (payload.role) {
        await client.join(`role:${payload.role}`);
      }

      // Store userId in socket data for later use
      const socketData = client.data as SocketData;
      socketData.userId = userId;
      socketData.role = payload.role;

      this.logger.log(
        `User ${userId} connected with socket ${client.id}. Total sockets: ${userSocketSet?.size || 0}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to notifications',
        userId,
      });
    } catch (error) {
      this.logger.error(
        `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const socketData = client.data as SocketData;
    const userId = socketData.userId;

    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);

        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.logger.log(`User ${userId} fully disconnected`);
        } else {
          this.logger.log(
            `User ${userId} socket ${client.id} disconnected. Remaining: ${sockets.size}`,
          );
        }
      }
    }
  }

  // ============== PUBLIC METHODS FOR SENDING NOTIFICATIONS ==============

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: number, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.debug(`Sent notification to user ${userId}`);
  }

  /**
   * Send notification to multiple users
   */
  sendNotificationToUsers(userIds: number[], notification: Notification) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
    this.logger.debug(`Sent notification to ${userIds.length} users`);
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcastNotification(notification: Notification) {
    this.server.emit('notification', notification);
    this.logger.debug('Broadcast notification to all users');
  }

  /**
   * Send notification to users by role
   */
  sendNotificationByRole(role: string, notification: Notification) {
    this.server.to(`role:${role}`).emit('notification', notification);
    this.logger.debug(`Sent notification to role: ${role}`);
  }

  /**
   * Send notification count update to user
   */
  sendUnreadCountUpdate(userId: number, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCount', { count });
    this.logger.debug(`Sent unread count ${count} to user ${userId}`);
  }

  /**
   * Mark notification as read (real-time update)
   */
  notifyNotificationRead(userId: number, notificationId: number) {
    this.server
      .to(`user:${userId}`)
      .emit('notificationRead', { notificationId });
  }

  /**
   * Mark all notifications as read (real-time update)
   */
  notifyAllNotificationsRead(userId: number) {
    this.server.to(`user:${userId}`).emit('allNotificationsRead');
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Get user's socket count
   */
  getUserSocketCount(userId: number): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  // ============== WEBSOCKET MESSAGE HANDLERS ==============

  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }
}
