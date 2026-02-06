import { IsNumber, IsOptional, IsString, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBulkPaymentDto {
  @ApiProperty()
  @IsNumber()
  userId: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Optional array of settlement IDs to pay. If provided, only these settlements will be paid.'
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  settlementIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentProof?: string;
}

export class SettlementSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;
}

export class BulkPaymentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  totalPendingAmount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty()
  remainingAmount: number;

  @ApiProperty()
  settlementsUpdated: number;

  @ApiProperty({ type: [SettlementSummaryDto] })
  settlementsPaid: SettlementSummaryDto[];

  @ApiProperty({ type: [SettlementSummaryDto] })
  settlementsRemaining: SettlementSummaryDto[];

  @ApiPropertyOptional()
  paymentProof?: string;

  @ApiProperty()
  paidAt: string;
}

export class BulkPaymentDistributionDto {
  @ApiProperty()
  settlementId: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  type: string;
}

export class BulkPaymentHistoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty()
  remainingAmount: number;

  @ApiPropertyOptional()
  paymentProof?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  paidAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  adminName: string;

  @ApiProperty()
  settlementsCount: number;

  @ApiProperty({ type: [BulkPaymentDistributionDto] })
  distributions: BulkPaymentDistributionDto[];
}

export class PendingSettlementItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  orderRequestId: number;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  createdAt: Date;
}

export class UserPendingSummaryDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  totalPendingAmount: number;

  @ApiProperty()
  settlementCount: number;

  @ApiProperty({ type: [PendingSettlementItemDto] })
  settlements: PendingSettlementItemDto[];
}
