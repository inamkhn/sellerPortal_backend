import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductCategory, ProductCondition } from '@prisma/client';
import { Type } from 'class-transformer';

export class ProductQueryDto {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: 'Search term for product title and description',
    example: 'sofa',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by product category',
    enum: ProductCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductCategory, { message: 'Invalid product category' })
  category?: ProductCategory;

  @ApiProperty({
    description: 'Filter by product condition',
    enum: ProductCondition,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductCondition, { message: 'Invalid product condition' })
  condition?: ProductCondition;

  @ApiProperty({
    description: 'Minimum price filter',
    example: 1000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Min price must be a number' })
  @Min(0, { message: 'Min price cannot be negative' })
  @Type(() => Number)
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    example: 50000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Max price must be a number' })
  @Min(0, { message: 'Max price cannot be negative' })
  @Type(() => Number)
  maxPrice?: number;

  @ApiProperty({
    description: 'Filter by product location',
    example: 'Karachi',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Filter by product brand',
    example: 'IKEA',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'price',
    enum: ['price', 'createdAt', 'title'],
    required: false,
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'price' | 'createdAt' | 'title' = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
