import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum PaymentMethod {
  EASYPAISA = 'EASYPAISA',
  JAZZCASH = 'JAZZCASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.EASYPAISA,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Transaction ID',
    example: 'EP-123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Payment proof URL (uploaded file)',
    example: 'https://example.com/payment-proof.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentProof?: string;

  @ApiProperty({
    description: 'Optional notes',
    example: 'Payment processed successfully',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
