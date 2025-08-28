import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { ConversationDto, MessageDto } from './types/chat.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string;
  };
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiResponse({
    status: 200,
    description: 'List of user conversations',
    type: ConversationDto,
    isArray: true,
  })
  async getConversations(
    @Request() req: AuthenticatedRequest,
    @Query() query: ConversationQueryDto,
  ) {
    const result = await this.chatService.findUserConversations(
      req.user.id,
      query,
    );
    return {
      success: true,
      data: result.conversations,
      pagination: result.pagination,
    };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get conversation with admin' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created or retrieved',
    type: ConversationDto,
  })
  @ApiQuery({
    name: 'targetUserId',
    required: false,
    description: 'Target user ID (required for admin users)',
  })
  async createConversation(
    @Request() req: AuthenticatedRequest,
    @Query('targetUserId') targetUserId?: string,
  ) {
    const targetId = targetUserId ? parseInt(targetUserId) : undefined;
    const conversation = await this.chatService.findOrCreateConversation(
      req.user.id,
      targetId,
    );
    return {
      success: true,
      data: conversation,
    };
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get specific conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation details',
    type: ConversationDto,
  })
  async getConversation(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const conversation = await this.chatService.getConversationById(
      id,
      req.user.id,
    );
    return {
      success: true,
      data: conversation,
    };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Messages per page',
  })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    type: MessageDto,
    isArray: true,
  })
  async getMessages(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 50;

    const result = await this.chatService.getConversationMessages(
      id,
      req.user.id,
      pageNum,
      limitNum,
    );
    return {
      success: true,
      data: result.messages,
      pagination: result.pagination,
    };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageDto,
  })
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const message = await this.chatService.createMessage(
      id,
      req.user.id,
      createMessageDto,
    );
    return {
      success: true,
      data: message,
    };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
  })
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.chatService.markMessagesAsRead(id, req.user.id);
    return {
      success: true,
      message: 'Messages marked as read',
      data: result,
    };
  }

  @Post('conversations/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload image attachment to conversation' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded and message sent successfully',
    type: MessageDto,
  })
  async uploadImage(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('content') content?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file
    this.uploadService.validateImageFile(file);

    // Upload to cloudinary
    const uploadResult = await this.uploadService.uploadImage(file, 'chat');

    // Create image message
    const message = await this.chatService.createImageMessage(
      id,
      req.user.id,
      uploadResult.secure_url,
      content,
    );

    return {
      success: true,
      data: message,
    };
  }

  // Admin-only endpoints
  @Get('admin/conversations')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all conversations (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all conversations',
    type: ConversationDto,
    isArray: true,
  })
  async getAllConversations(
    @Request() req: AuthenticatedRequest,
    @Query() query: ConversationQueryDto,
  ) {
    const result = await this.chatService.getAllConversations(
      req.user.id,
      query,
    );
    return {
      success: true,
      data: result.conversations,
      pagination: result.pagination,
    };
  }

  @Patch('conversations/:id/archive')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archive conversation (Admin only)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation archived successfully',
    type: ConversationDto,
  })
  async archiveConversation(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const conversation = await this.chatService.archiveConversation(
      id,
      req.user.id,
    );
    return {
      success: true,
      message: 'Conversation archived successfully',
      data: conversation,
    };
  }
}
