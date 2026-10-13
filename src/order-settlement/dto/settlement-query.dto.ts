import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderSettlementStatus } from '@prisma/client';

export class SettlementQueryDto {
  @ApiProperty({
    description: 'Filter by status',
    enum: OrderSettlementStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderSettlementStatus)
  status?: OrderSettlementStatus;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Search by order ID or seller name',
    example: 'ORD-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
