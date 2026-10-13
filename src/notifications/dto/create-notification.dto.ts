import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsArray,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: 1,
  })
  @IsInt()
  userId: number;

  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: 'ANNOUNCEMENT',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Announcement',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Check out our latest updates!',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Action URL for the notification',
    example: '/announcements/1',
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Reference ID (e.g., announcement ID, order ID)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  referenceId?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { priority: 'HIGH' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateBulkNotificationDto {
  @ApiProperty({
    description: 'Array of user IDs to send notification to',
    example: [1, 2, 3],
  })
  @IsArray()
  @IsInt({ each: true })
  userIds: number[];

  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: 'ANNOUNCEMENT',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Announcement',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Check out our latest updates!',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Action URL for the notification',
    example: '/announcements/1',
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Reference ID (e.g., announcement ID, order ID)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  referenceId?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { priority: 'HIGH' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
