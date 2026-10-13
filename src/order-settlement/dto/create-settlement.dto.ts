import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSettlementDto {
  @ApiProperty({
    description: 'Order request ID',
    example: 1,
  })
  @IsNumber()
  orderRequestId: number;

  @ApiProperty({
    description: 'Product cost in PKR',
    example: 35000,
  })
  @IsNumber()
  @Min(0)
  productCost: number;

  @ApiProperty({
    description: 'Admin commission in PKR',
    example: 7500,
  })
  @IsNumber()
  @Min(0)
  adminCommission: number;

  @ApiProperty({
    description: 'Optional notes',
    example: 'Settlement for delivered order',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
