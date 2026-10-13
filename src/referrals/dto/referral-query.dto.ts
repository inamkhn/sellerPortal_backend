import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReferralStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ReferralSortBy {
  COMMISSION = 'commission',
  ORDERS = 'orders',
  DATE = 'date',
}

export class ReferralQueryDto {
  @ApiProperty({
    description: 'Search by name or email',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by status',
    enum: ReferralStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @ApiProperty({
    description: 'Sort by field',
    enum: ReferralSortBy,
    required: false,
    default: ReferralSortBy.COMMISSION,
  })
  @IsOptional()
  @IsEnum(ReferralSortBy)
  sortBy?: ReferralSortBy = ReferralSortBy.COMMISSION;

  @ApiProperty({
    description: 'Filter by join date from',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Filter by join date to',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

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
}
