import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { UploadModule } from '../upload/upload.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({}), // For WebSocket authentication
    UploadModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}
