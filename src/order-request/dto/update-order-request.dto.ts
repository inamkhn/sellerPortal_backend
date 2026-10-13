import {
  IsString,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { Platform } from './create-order-request.dto';

export class UpdateOrderRequestDto {
  @ApiProperty({
    example: 'Ahmed Khan',
    required: false,
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Customer name must be a string' })
  @Length(2, 100, {
    message: 'Customer name must be between 2 and 100 characters',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  customerName?: string;

  @ApiProperty({
    example: '+92 300 1234567',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Customer phone must be a string' })
  @Transform(({ value }: { value: string }) => value?.trim())
  customerPhone?: string;

  @ApiProperty({
    example: '+92 300 1234567',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Customer WhatsApp must be a string' })
  @Transform(({ value }: { value: string }) => value?.trim())
  customerWhatsapp?: string;

  @ApiProperty({
    example: 'ahmed@example.com',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (!value || value.trim() === '') return undefined;
    return value.trim().toLowerCase();
  })
  @IsEmail({}, { message: 'Invalid email format' })
  customerEmail?: string;

  @ApiProperty({
    example: 'Customer prefers morning delivery',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Customer notes must be a string' })
  @Length(0, 1000, { message: 'Customer notes must not exceed 500 characters' })
  customerNotes?: string;

  @ApiProperty({
    example: 45000,
    required: false,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Decided price must be a number' })
  @Min(0.01, { message: 'Decided price must be greater than 0' })
  @Type(() => Number)
  decidedPrice?: number;

  @ApiProperty({
    enum: Platform,
    example: Platform.FACEBOOK,
    required: false,
  })
  @IsOptional()
  @IsEnum(Platform, { message: 'Invalid platform' })
  platform?: Platform;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Advance payment must be a boolean' })
  advancePayment?: boolean;

  @ApiProperty({
    example: 15000,
    required: false,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Advance pay must be a number' })
  @Min(0.01, { message: 'Advance pay must be greater than 0' })
  @Type(() => Number)
  advancePay?: number;

  @ApiProperty({
    example: '123 Main Street, Karachi',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Delivery address must be a string' })
  @Length(0, 200, {
    message: 'Delivery address must not exceed 200 characters',
  })
  deliveryAddress?: string;

  @ApiProperty({
    example: '2024-12-25T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid delivery date format' })
  deliveryDate?: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
    required: false,
    description: 'Order status (ADMIN only)',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status?: OrderStatus;
}
