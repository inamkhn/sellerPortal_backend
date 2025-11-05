import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ChatRoomType {
  ADMIN_SUPPORT = 'ADMIN_SUPPORT',
  MANAGER_SUPPORT = 'MANAGER_SUPPORT',
  DIRECT = 'DIRECT',
}

export class CreateChatRoomDto {
  @ApiProperty({
    enum: ChatRoomType,
    description: 'Type of chat room',
    example: ChatRoomType.ADMIN_SUPPORT,
  })
  @IsEnum(ChatRoomType)
  type: ChatRoomType;

  @ApiProperty({
    description: 'Target user ID (for DIRECT chats or MANAGER_SUPPORT)',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  targetUserId?: number;
}
