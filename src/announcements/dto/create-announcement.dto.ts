import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementPriority, Role } from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    example: 'System Maintenance Notice',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Announcement message content',
    example:
      'The system will be under maintenance on Sunday from 2 AM to 4 AM.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    enum: AnnouncementPriority,
    description: 'Priority level of the announcement',
    default: AnnouncementPriority.NORMAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiProperty({
    enum: Role,
    description: 'Target specific role (optional, null means all users)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(Role)
  targetRole?: Role;

  @ApiProperty({
    description: 'Expiration date for the announcement',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
