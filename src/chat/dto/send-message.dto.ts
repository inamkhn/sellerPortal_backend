import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  FILE = 'FILE',
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how can I help you?',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MinLength(1, { message: 'Message must be at least 1 character' })
  @MaxLength(5000, { message: 'Message cannot exceed 5000 characters' })
  @Transform(({ value }) => value?.trim())
  content: string;

  @ApiProperty({
    enum: MessageType,
    description: 'Type of message',
    default: MessageType.TEXT,
    required: false,
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: string;

  @ApiProperty({
    description: 'ID of the message being replied to',
    example: 123,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  replyToId?: number;
}


