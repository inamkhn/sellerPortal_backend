import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFactoryPaymentDto {
  @IsNumber()
  orderRequestId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  paidAt?: Date;

  @IsOptional()
  @IsString()
  paymentProof?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FactoryPaymentSummaryDto {
  totalOwed: number;
  totalPaid: number;
  pendingBalance: number;
  totalDeliveredOrders: number;
}

export class OrderWithPaymentStatusDto {
  id: number;
  customerName: string;
  deliveryDate: Date | null;
  decidedPrice: number;
  productCost: number;
  advancePay: number;
  advanceReceivedBy: 'FACTORY' | 'ADMIN' | 'NONE';
  totalOwed: number;
  totalPaid: number;
  balance: number;
  paymentStatus: 'FULLY_PAID' | 'PARTIAL' | 'PENDING';
  paymentsCount: number;
}

export class GetOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: 'FULLY_PAID' | 'PARTIAL' | 'PENDING';

  @IsOptional()
  @IsString()
  advanceRecipient?: 'FACTORY' | 'ADMIN' | 'NONE';

  @IsOptional()
  @IsString()
  search?: string;
}

export class GetPaymentHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderRequestId?: number;
}
