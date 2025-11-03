import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum DateRange {
  SEVEN_DAYS = '7days',
  THIRTY_DAYS = '30days',
  NINETY_DAYS = '90days',
  TWELVE_MONTHS = '12months',
  ALL_TIME = 'AllTime',
}

export class AnalyticsQueryDto {
  @IsEnum(DateRange)
  dateRange: DateRange;
}

export class TopPerformersQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
