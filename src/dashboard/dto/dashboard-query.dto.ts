import { IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DashboardQueryDto {
  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    required: false,
    description: 'Start date for filtering data',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date format' })
  startDate?: string;

  @ApiProperty({
    example: '2024-12-31T23:59:59.999Z',
    required: false,
    description: 'End date for filtering data',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  endDate?: string;
}
