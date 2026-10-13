import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementPriority, Role } from '@prisma/client';

export class UpdateAnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Announcement message content',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    enum: AnnouncementPriority,
    description: 'Priority level of the announcement',
    required: false,
  })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiProperty({
    enum: Role,
    description: 'Target specific role',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(Role)
  targetRole?: Role;

  @ApiProperty({
    description: 'Whether the announcement is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Expiration date for the announcement',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
