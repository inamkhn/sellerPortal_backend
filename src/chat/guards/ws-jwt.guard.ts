import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        console.error('WsJwtGuard: No token provided');
        throw new WsException('Unauthorized: No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });


      // Attach user to socket for later use
      // Map JWT payload to user object expected by gateway
      client.data.user = {
        id: payload.sub || payload.id || payload.userId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
      };

      return true;
    } catch (error) {
      console.error('WsJwtGuard: Token verification failed:', error.message);
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query params (fallback for some clients)
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    return token as string | null;
  }
}
