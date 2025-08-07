import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order request ID for the payment',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  orderRequestId: number;

  @ApiProperty({
    description: 'User share amount',
    example: 22500.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  userShare: number;

  @ApiPropertyOptional({
    description: 'Referrer ID (if applicable)',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  referrerId?: number;

  @ApiPropertyOptional({
    description: 'Referrer share amount',
    example: 2500.0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  referrerShare?: number;

  @ApiProperty({
    description: 'Total payment amount',
    example: 25000.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  totalPrice: number;

  @ApiPropertyOptional({
    description: 'URL of payment proof screenshot',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/payments/proof.jpg',
  })
  @IsOptional()
  @IsUrl()
  proofScreenshotUrl?: string;

  @ApiPropertyOptional({
    description: 'Type of payment',
    enum: PaymentType,
    example: PaymentType.SELLER,
    default: PaymentType.SELLER,
  })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;
}
