import { User, Conversation, Message, MessageType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Clean user type for API responses (excluding sensitive fields)
export type PublicUser = Omit<
  User,
  'password' | 'refreshToken' | 'emailVerificationOtp' | 'passwordResetOtp'
>;

// Conversation with related data for API responses
export type ConversationWithUsers = Conversation & {
  user1: PublicUser;
  user2: PublicUser;
  lastMessage?: MessageWithSender | null;
  unreadCount?: number;
};

// Message with sender info for API responses
export type MessageWithSender = Message & {
  sender: PublicUser;
};

// API Response wrapper types
export interface ConversationResponse {
  success: boolean;
  data: ConversationWithUsers | ConversationWithUsers[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageResponse {
  success: boolean;
  data: MessageWithSender | MessageWithSender[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// For Swagger documentation
export class MessageDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  conversationId: number;

  @ApiProperty()
  senderId: number;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: MessageType })
  messageType: MessageType;

  @ApiPropertyOptional()
  attachmentUrl?: string;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ConversationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user1Id: number;

  @ApiProperty()
  user2Id: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  lastMessage?: MessageDto;

  @ApiPropertyOptional()
  unreadCount?: number;
}
