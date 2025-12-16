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
  ValidateIf,
  IsInt,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { CustomProductDto } from './custom-product.dto';

export enum OrderType {
  EXISTING_PRODUCT = 'EXISTING_PRODUCT',
  CUSTOM_PRODUCT = 'CUSTOM_PRODUCT',
}

export enum Platform {
  FACEBOOK = 'FACEBOOK',
  DUBIZZLE = 'DUBIZZLE',
  WHATSAPP = 'WHATSAPP',
  OTHER = 'OTHER',
}

export class CreateOrderRequestDto {
  @ApiProperty({
    enum: OrderType,
    example: OrderType.EXISTING_PRODUCT,
    description: 'Type of order',
  })
  @IsEnum(OrderType, {
    message: 'Order type must be EXISTING_PRODUCT or CUSTOM_PRODUCT',
  })
  orderType: OrderType;

  @ApiProperty({
    example: 123,
    required: false,
    description: 'Product ID (required for existing products)',
  })
  @ValidateIf(
    (o: CreateOrderRequestDto) => o.orderType === OrderType.EXISTING_PRODUCT,
  )
  @IsInt({ message: 'Product ID must be an integer' })
  @Type(() => Number)
  productId?: number;

  @ApiProperty({
    example: 'Ahmed Khan',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Customer name must be a string' })
  @Length(2, 100, {
    message: 'Customer name must be between 2 and 100 characters',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  customerName: string;

  @ApiProperty({
    example: '+92 300 1234567',
  })
  @IsString({ message: 'Customer phone must be a string' })
  @Transform(({ value }: { value: string }) => value?.trim())
  customerPhone: string;

  @ApiProperty({
    example: '+92 300 1234567',
  })
  @IsString({ message: 'Customer WhatsApp must be a string' })
  @Transform(({ value }: { value: string }) => value?.trim())
  customerWhatsapp: string;

  @ApiProperty({
    example: 'ahmed@example.com',
    required: false,
  })
  @Transform(({ value }: { value: string }) => {
    if (!value || value.trim() === '') return undefined;
    return value.trim().toLowerCase();
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  customerEmail?: string;

  @ApiProperty({
    example: 'Customer prefers morning delivery',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Customer notes must be a string' })
  @Length(0, 1000, { message: 'Customer notes must not exceed 500 characters' })
  customerNotes?: string;

  @ApiProperty({
    example: 45000,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Decided price must be a number' })
  @Min(0.01, { message: 'Decided price must be greater than 0' })
  @Type(() => Number)
  decidedPrice: number;

  @ApiProperty({
    enum: Platform,
    example: Platform.FACEBOOK,
  })
  @IsEnum(Platform, { message: 'Invalid platform' })
  platform: Platform;

  @ApiProperty({
    example: true,
  })
  @Transform(({ value }: { value: unknown }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean({ message: 'Advance payment must be a boolean' })
  advancePayment: boolean;

  @ApiProperty({
    example: 15000,
    required: false,
    minimum: 0.01,
  })
  @ValidateIf((o: CreateOrderRequestDto) => o.advancePayment === true)
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
    type: [CustomProductDto],
    required: false,
    description:
      'Array of custom products (required for custom product orders)',
  })
  @ValidateIf(
    (o: CreateOrderRequestDto) => o.orderType === OrderType.CUSTOM_PRODUCT,
  )
  @Transform(({ value }: { value: unknown }): unknown => {
    console.log('Transform customProducts - Input type:', typeof value);
    console.log('Transform customProducts - Input value:', value);

    // If it's a string (from FormData), parse it first
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        console.log('Transform customProducts - Parsed:', parsed);

        // Convert plain objects to CustomProductDto instances
        if (Array.isArray(parsed)) {
          const { plainToInstance } = require('class-transformer');
          const instances = plainToInstance(CustomProductDto, parsed, {
            excludeExtraneousValues: false,
          });
          console.log(
            'Transform customProducts - Converted to instances:',
            instances,
          );
          return instances;
        }
        return parsed;
      } catch (error) {
        console.error('Transform customProducts - Parse error:', error);
        return value;
      }
    }
    // Otherwise return as-is (already an array or object)
    console.log('Transform customProducts - Returning as-is');
    return value;
  })
  @Type(() => CustomProductDto)
  @IsArray({ message: 'Custom products must be an array' })
  @ArrayMinSize(1, { message: 'At least one custom product is required' })
  @ValidateNested({ each: true })
  customProducts?: CustomProductDto[];

  // Deprecated fields - kept for backward compatibility
  @ApiProperty({
    example: 'Custom L-Shaped Leather Sofa',
    required: false,
    deprecated: true,
    description: 'Deprecated: Use customProducts array instead',
  })
  @IsOptional()
  customProductName?: string;

  @ApiProperty({
    example: 'Brown leather, 8-seater, with reclining feature',
    required: false,
    deprecated: true,
    description: 'Deprecated: Use customProducts array instead',
  })
  @IsOptional()
  customProductDescription?: string;

  @ApiProperty({
    example: 4,
    required: false,
    deprecated: true,
    description: 'Deprecated: Use customProducts array instead',
  })
  @IsOptional()
  @IsInt({ message: 'Category ID must be an integer' })
  @Type(() => Number)
  categoryId?: number;
}
