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
} from '@nestjs/common';
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
import { ChatRoomFiltersDto, SendMessageDto, GetMessagesDto } from './dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Get user chat rooms' })
  @ApiResponse({
    status: 200,
    description: 'Chat rooms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array' },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserChatRooms(
    @CurrentUser() user: User,
    @Query() filters: ChatRoomFiltersDto,
  ) {
    return this.chatService.getUserChatRooms(user.id, filters);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get chat room details' })
  @ApiResponse({ status: 200, description: 'Chat room details retrieved' })
  @ApiResponse({ status: 404, description: 'Chat room not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getChatRoomDetails(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) roomId: number,
  ) {
    return this.chatService.getChatRoomDetails(roomId, user.id);
  }

  @Get('rooms/:id/messages')
  @ApiOperation({ summary: 'Get chat room messages with cursor pagination' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array' },
        hasMore: { type: 'boolean' },
        nextCursor: { type: 'number', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Access denied to this chat room' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMessages(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) roomId: number,
    @Query() dto: GetMessagesDto,
  ) {
    return this.chatService.getMessages(roomId, user.id, dto.cursor, dto.limit);
  }

  @Post('rooms/:id/messages')
  @ApiOperation({ summary: 'Send a text message to a chat room' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to this chat room' })
  @ApiResponse({ status: 400, description: 'Invalid message data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) roomId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      roomId,
      user.id,
      dto.content || '',
      dto.messageType,
    );
  }

  @Post('rooms/:id/messages/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send a message with file attachment' })
  @ApiResponse({ status: 201, description: 'Message with file sent' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async sendMessageWithFile(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) roomId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('content') content?: string,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Determine message type based on file mimetype
    let messageType = 'FILE';
    if (file.mimetype.startsWith('image/')) {
      messageType = 'IMAGE';
    } else if (file.mimetype.startsWith('video/')) {
      messageType = 'VIDEO';
    } else if (file.mimetype.startsWith('audio/')) {
      messageType = 'AUDIO';
    } else if (
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('document')
    ) {
      messageType = 'DOCUMENT';
    }

    return this.chatService.sendMessageWithFile(
      roomId,
      user.id,
      file,
      content || '',
      messageType,
    );
  }

  @Get('admin/support')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get admin support chats (optimized with batch queries)',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin support chats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array' },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAdminSupportChats(
    @CurrentUser() user: User,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.chatService.getAdminSupportChats(user.id, page, limit);
  }

  @Get('manager/support')
  @UseGuards(RolesGuard)
  @Roles('REFERRAL_MANAGER')
  @ApiOperation({
    summary: 'Get manager support chats with referral stats (optimized)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Manager support chats retrieved successfully with order statistics',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              type: { type: 'string' },
              unreadCount: { type: 'number' },
              referralStats: {
                type: 'object',
                properties: {
                  totalOrders: { type: 'number' },
                  totalRevenue: { type: 'number' },
                },
              },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Manager role required',
  })
  async getManagerSupportChats(
    @CurrentUser() user: User,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.chatService.getManagerSupportChats(user.id, page, limit);
  }

  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get all users for admin chat directory with search',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array' },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAllUsersForAdmin(
    @CurrentUser() user: User,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.chatService.getAllUsersForAdmin(page, limit, search, role);
  }

  @Post('admin/initiate/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Admin initiates or retrieves existing chat with a user',
  })
  @ApiResponse({
    status: 201,
    description: 'Chat room created or retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async adminInitiateChat(
    @CurrentUser() admin: User,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.chatService.adminInitiateChat(admin.id, userId);
  }

  @Get('manager/admin-chat')
  @UseGuards(RolesGuard)
  @Roles('REFERRAL_MANAGER')
  @ApiOperation({ summary: 'Get or create manager chat with admin support' })
  @ApiResponse({
    status: 200,
    description: 'Admin chat retrieved or created successfully',
  })
  @ApiResponse({ status: 404, description: 'No admin available' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Manager role required',
  })
  async getManagerAdminChat(@CurrentUser() manager: User) {
    return this.chatService.getOrCreateManagerAdminChat(manager.id);
  }

  @Get('user/admin-chat')
  @UseGuards(RolesGuard)
  @Roles('USER', 'REFERRAL_MANAGER')
  @ApiOperation({ summary: 'Get or create user chat with admin support' })
  @ApiResponse({
    status: 200,
    description: 'Admin chat retrieved or created successfully',
  })
  @ApiResponse({ status: 404, description: 'No admin available' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserAdminChat(@CurrentUser() user: User) {
    return this.chatService.getOrCreateUserAdminChat(user.id);
  }

  @Get('user/manager-chat')
  @UseGuards(RolesGuard)
  @Roles('USER')
  @ApiOperation({
    summary: 'Get or create user chat with their referral manager',
  })
  @ApiResponse({
    status: 200,
    description: 'Manager chat retrieved or created',
  })
  @ApiResponse({ status: 404, description: 'No referral manager found' })
  async getUserManagerChat(@CurrentUser() user: User) {
    return this.chatService.getOrCreateUserManagerChat(user.id);
  }
}
