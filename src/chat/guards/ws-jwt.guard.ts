import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PrismaService } from '../../database/database.service';

interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: number;
      email: string;
      role: string;
      firstName: string | null;
      lastName: string | null;
    };
  };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: AuthenticatedSocket = context
        .switchToWs()
        .getClient<AuthenticatedSocket>();
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token);

      if (!payload.sub || typeof payload.sub !== 'number') {
        throw new WsException('Invalid token payload');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        throw new WsException('User not found');
      }

      client.data.user = user;
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unauthorized';
      throw new WsException(errorMessage);
    }
  }

  private extractTokenFromHandshake(
    client: AuthenticatedSocket,
  ): string | undefined {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      client.handshake.headers?.authorization;

    if (typeof token === 'string') {
      return token.startsWith('Bearer ') ? token.substring(7) : token;
    }

    return undefined;
  }
}
