import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VOICE_NOTE = 'VOICE_NOTE',
  FILE = 'FILE',
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how can I help you?',
  })
  @IsString()
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
}
