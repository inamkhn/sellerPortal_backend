import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Product ID for the order',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  productId: number;

  @ApiPropertyOptional({
    description: 'Platform where the order was placed',
    example: 'Website',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({
    description: 'Decided price for the product',
    example: 25000.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  decidedPrice: number;

  @ApiPropertyOptional({
    description: 'Whether advance payment is required',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  advancePayment?: boolean;

  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+923001234567',
  })
  @IsNotEmpty()
  @IsString()
  customerPhone: string;

  @ApiProperty({
    description: 'Customer WhatsApp number',
    example: '+923001234567',
  })
  @IsNotEmpty()
  @IsString()
  customerWhatsapp: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({
    description: 'Additional notes from customer',
    example: 'Please deliver between 2-4 PM',
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({
    description: 'Custom product name if different from original',
    example: 'Custom Leather Sofa',
  })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({
    description: 'Custom product description',
    example: 'Modified with custom cushions',
  })
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiPropertyOptional({
    description: 'Array of custom image URLs',
    example: [
      'https://example.com/custom1.jpg',
      'https://example.com/custom2.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customizeImages?: string[];

  @ApiPropertyOptional({
    description: 'Expected delivering date',
    example: '2024-02-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  deliveringDate?: string;

  @ApiPropertyOptional({
    description: 'Delivery address',
    example: '123 Main Street, Karachi, Pakistan',
  })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Delivery date',
    example: '2024-02-20T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
