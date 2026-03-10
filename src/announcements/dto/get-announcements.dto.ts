import { IsOptional, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementPriority } from '@prisma/client';

export class GetAnnouncementsDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({
    enum: AnnouncementPriority,
    description: 'Filter by priority',
    required: false,
  })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiProperty({
    description: 'Filter by active status',
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Filter by announcement title',
    required: false,
  })
  @IsOptional()
  title?: string;
}
