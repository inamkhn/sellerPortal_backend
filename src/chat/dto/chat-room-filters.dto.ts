import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ChatRoomType } from '@prisma/client';

export class ChatRoomFiltersDto {
  @ApiProperty({
    enum: ChatRoomType,
    description: 'Filter by chat room type',
    required: false,
  })
  @IsOptional()
  @IsEnum(ChatRoomType)
  type?: ChatRoomType;

  @ApiProperty({
    description: 'Search by participant name',
    required: false,
    example: 'John',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
