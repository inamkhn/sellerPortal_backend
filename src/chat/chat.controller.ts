import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  SendMessageDto,
  GetMessagesDto,
  AddReactionDto,
  GlobalChatInfoResponseDto,
  GetMessagesResponseDto,
  GroupMessageDto,
  MarkAsReadResponseDto,
  DeleteMessageResponseDto,
  ReactionResponseDto,
} from './dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat/global')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Get()
  @ApiOperation({ summary: 'Get global chat info' })
  @ApiResponse({
    status: 200,
    description: 'Global chat info retrieved',
    type: GlobalChatInfoResponseDto,
  })
  async getGlobalChat(@CurrentUser() user: User): Promise<GlobalChatInfoResponseDto> {
    // @ts-expect-error - Prisma returns compatible types but TypeScript can't infer
    return this.chatService.getGlobalChatInfo(user.id);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get global chat messages with cursor pagination' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: GetMessagesResponseDto,
  })
  async getMessages(
    @CurrentUser() user: User,
    @Query() dto: GetMessagesDto,
  ): Promise<GetMessagesResponseDto> {
    // @ts-expect-error - Prisma JsonValue is compatible with Record<string, number[]>
    return this.chatService.getGlobalChatMessages(user.id, dto.cursor, dto.limit);
  }

  @Post('messages')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 messages per minute
  @ApiOperation({ summary: 'Send a text message to global chat' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: GroupMessageDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentUser() user: User,
    @Body() dto: SendMessageDto,
  ): Promise<GroupMessageDto> {
    // @ts-expect-error - Prisma JsonValue is compatible with Record<string, number[]>
    return this.chatService.sendGlobalMessage(
      user.id,
      dto.content,
      dto.messageType || 'TEXT',
      dto.replyToId,
    );
  }

  @Post('messages/upload')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 file uploads per minute
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
      fileFilter: (req, file, cb) => {
        // Whitelist of allowed MIME types
        const allowedMimes = [
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          // Videos
          'video/mp4',
          'video/webm',
          'video/quicktime',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          // Text files
          'text/plain',
          'text/csv',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `File type ${file.mimetype} is not allowed. Allowed types: images, videos, documents, and text files.`,
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send a message with file attachment' })
  @ApiResponse({
    status: 201,
    description: 'Message with file sent',
    type: GroupMessageDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing, too large, or invalid type',
  })
  @HttpCode(HttpStatus.CREATED)
  async sendMessageWithFile(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('content') content?: string,
    @Body('replyToId') replyToId?: number,
  ): Promise<GroupMessageDto> {
    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // @ts-expect-error - Prisma JsonValue is compatible with Record<string, number[]>
    return this.chatService.sendGlobalMessageWithFile(
      user.id,
      file,
      content,
      replyToId ? Number(replyToId) : undefined,
    );
  }

  @Patch('messages/read')
  @ApiOperation({ summary: 'Mark all messages as read' })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
    type: MarkAsReadResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async markAsRead(@CurrentUser() user: User): Promise<MarkAsReadResponseDto> {
    return this.chatService.markMessagesAsRead(user.id);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted',
    type: DeleteMessageResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Can only delete own messages' })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) messageId: number,
  ): Promise<DeleteMessageResponseDto> {
    return this.chatService.deleteMessage(messageId, user.id);
  }

  @Get('pinned')
  @ApiOperation({ summary: 'Get all pinned messages' })
  @ApiResponse({
    status: 200,
    description: 'Pinned messages retrieved',
    type: [GroupMessageDto],
  })
  async getPinnedMessages(@CurrentUser() user: User): Promise<GroupMessageDto[]> {
    // @ts-expect-error - Prisma JsonValue is compatible with Record<string, number[]>
    return this.chatService.getPinnedMessages();
  }

  @Patch('messages/:id/pin')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 pin toggles per minute
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle pin status of a message (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Pin status toggled',
    type: GroupMessageDto,
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async togglePinMessage(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) messageId: number,
  ): Promise<GroupMessageDto> {
    // @ts-expect-error - Prisma JsonValue is compatible with Record<string, number[]>
    return this.chatService.togglePinMessage(messageId, admin.id);
  }

  @Post('messages/:id/reactions')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 reactions per minute
  @ApiOperation({ summary: 'Add reaction to a message' })
  @ApiResponse({
    status: 200,
    description: 'Reaction added',
    type: ReactionResponseDto,
  })
  async addReaction(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) messageId: number,
    @Body() dto: AddReactionDto,
  ): Promise<ReactionResponseDto> {
    return this.chatService.addReaction(messageId, user.id, dto.emoji);
  }

  @Delete('messages/:id/reactions/:emoji')
  @ApiOperation({ summary: 'Remove reaction from a message' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed',
    type: ReactionResponseDto,
  })
  async removeReaction(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) messageId: number,
    @Param('emoji') emoji: string,
  ): Promise<ReactionResponseDto> {
    return this.chatService.removeReaction(messageId, user.id, emoji);
  }
}
