import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCustomProductDto {
  @ApiProperty({
    example: 'Custom L-Shaped Leather Sofa',
    required: false,
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Product name must be a string' })
  @Length(3, 100, {
    message: 'Product name must be between 3 and 100 characters',
  })
  name?: string;

  @ApiProperty({
    example: 'Brown leather, 8-seater, with reclining feature',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 1000, {
    message: 'Description must not exceed 1000 characters',
  })
  description?: string;

  @ApiProperty({
    example: 4,
    required: false,
    description: 'Category ID',
  })
  @IsOptional()
  @IsInt({ message: 'Category ID must be an integer' })
  @Min(1, { message: 'Category ID must be at least 1' })
  @Type(() => Number)
  categoryId?: number;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Images must be an array' })
  @IsString({ each: true, message: 'Each image must be a string URL' })
  images?: string[];
}
