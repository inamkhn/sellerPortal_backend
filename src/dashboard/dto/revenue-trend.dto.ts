import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RevenueTrendDataPoint {
  @ApiProperty({ description: 'Month label (e.g., "Jan", "Feb")' })
  label: string;

  @ApiProperty({ description: 'Revenue value for the month' })
  value: number;
}

export class RevenueTrendDto {
  @ApiProperty({
    type: [RevenueTrendDataPoint],
    description: 'Monthly revenue data',
  })
  data: RevenueTrendDataPoint[];
}

export class RevenueTrendQueryDto {
  @ApiProperty({
    required: false,
    default: 12,
    description: 'Number of months to fetch',
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(24)
  months?: number;
}
