import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettlementDto {
  @ApiProperty({
    description: 'Product cost in PKR',
    example: 35000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  productCost?: number;

  @ApiProperty({
    description: 'Admin commission in PKR',
    example: 7500,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adminCommission?: number;

  @ApiProperty({
    description: 'Optional notes',
    example: 'Updated settlement details',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
