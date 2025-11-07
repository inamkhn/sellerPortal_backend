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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateChatRoomDto,
  ChatRoomFiltersDto,
  SendMessageDto,
  GetMessagesDto,
} from './dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  @ApiOperation({ summary: 'Create or get existing chat room' })
  @ApiResponse({ status: 201, description: 'Chat room created or retrieved' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createOrGetChatRoom(
    @CurrentUser() user: User,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatService.createOrGetChatRoom(
      user.id,
      dto.type,
      dto.targetUserId,
    );
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get user chat rooms' })
  @ApiResponse({ status: 200, description: 'Chat rooms retrieved' })
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
  @ApiOperation({ summary: 'Get chat room messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getMessages(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) roomId: number,
    @Query() dto: GetMessagesDto,
  ) {
    return this.chatService.getMessages(roomId, user.id, dto.cursor, dto.limit);
  }

  @Post('rooms/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Access denied' })
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

  @Patch('rooms/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) roomId: number,
  ) {
    return this.chatService.markMessagesAsRead(roomId, user.id);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) messageId: number,
  ) {
    return this.chatService.softDeleteMessage(messageId, user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search chat rooms and messages' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@CurrentUser() user: User, @Query('q') query: string) {
    const [rooms, messages] = await Promise.all([
      this.chatService.searchChatRooms(user.id, query),
      this.chatService.searchMessages(user.id, query),
    ]);

    return { rooms, messages };
  }

  @Get('admin/support')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get admin support chats' })
  @ApiResponse({ status: 200, description: 'Admin support chats retrieved' })
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
  @ApiOperation({ summary: 'Get manager support chats' })
  @ApiResponse({ status: 200, description: 'Manager support chats retrieved' })
  async getManagerSupportChats(
    @CurrentUser() user: User,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.chatService.getManagerSupportChats(user.id, page, limit);
  }
}
