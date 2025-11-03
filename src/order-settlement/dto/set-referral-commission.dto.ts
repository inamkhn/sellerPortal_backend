import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class SetReferralCommissionDto {
  @ApiProperty({
    description: 'Commission rate percentage (e.g., 15 for 15%)',
    example: 15,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;

  @ApiProperty({
    description: 'Optional notes',
    example: 'Commission set by referral manager',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
