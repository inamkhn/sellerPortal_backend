import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsPositive,
  IsInt,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductCondition } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product title',
    example: 'Comfortable Leather Sofa',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @Length(3, 200, { message: 'Title must be between 3 and 200 characters' })
  title: string;

  @ApiProperty({
    description: 'Product description',
    example:
      'A beautiful and comfortable leather sofa perfect for your living room',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Product price in decimal format',
    example: 25000.5,
    minimum: 0.01,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a valid decimal with up to 2 decimal places' },
  )
  @IsPositive({ message: 'Price must be positive' })
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'Product category ID',
    example: 1,
  })
  @IsInt({ message: 'Category ID must be an integer' })
  @Type(() => Number)
  categoryId: number;

  @ApiProperty({
    description: 'Product condition',
    enum: ProductCondition,
    example: ProductCondition.LIKE_NEW,
  })
  @IsEnum(ProductCondition, { message: 'Invalid product condition' })
  condition: ProductCondition;

  @ApiProperty({
    description: 'Product brand',
    example: 'IKEA',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Brand must not exceed 100 characters' })
  brand?: string;

  @ApiProperty({
    description: 'Available colors',
    example: ['Brown', 'Black', 'White'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each color must be a string' })
  colors?: string[];

  @ApiProperty({
    description: 'Product location',
    example: 'Karachi, Pakistan',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Location must not exceed 200 characters' })
  location?: string;

  @ApiProperty({
    description: 'Product material',
    example: 'Leather',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Material must not exceed 100 characters' })
  material?: string;

  @ApiProperty({
    description: 'Product tags for search and categorization',
    example: ['furniture', 'living-room', 'comfortable'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each tag must be a string' })
  productTags?: string[];

  @ApiProperty({
    description: 'Available quantity',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(1000, { message: 'Quantity cannot exceed 1000' })
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'SOFA-001',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50, { message: 'SKU must not exceed 50 characters' })
  sku?: string;

  @ApiProperty({
    description: 'Product photos as base64 encoded strings',
    example: ['data:image/jpeg;base64,/9j/4AAQSkZJRg...'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each photo must be a base64 string' })
  photos?: string[];
}
