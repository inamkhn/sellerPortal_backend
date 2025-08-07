import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { CreatePaymentDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiPropertyOptional({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'URL of payment proof screenshot',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/payments/proof.jpg',
  })
  @IsOptional()
  @IsUrl()
  proofScreenshotUrl?: string;
}
