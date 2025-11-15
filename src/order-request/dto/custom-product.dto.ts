import { IsString, IsInt, IsOptional, Length, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform, Expose } from 'class-transformer';

export class CustomProductDto {
  @ApiProperty({
    example: 'Custom L-Shaped Leather Sofa',
    minLength: 3,
    maxLength: 100,
  })
  @Expose()
  @IsString({ message: 'Custom product name must be a string' })
  @Length(3, 100, {
    message: 'Custom product name must be between 3 and 100 characters',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({
    example: 'Brown leather, 8-seater, with reclining feature',
    minLength: 10,
    maxLength: 1000,
  })
  @Expose()
  @IsString({ message: 'Custom product description must be a string' })
  @Length(10, 1000, {
    message:
      'Custom product description must be between 10 and 1000 characters',
  })
  description: string;

  @ApiProperty({
    example: 4,
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsInt({ message: 'Category ID must be an integer' })
  @Type(() => Number)
  categoryId?: number;

  @ApiProperty({
    example: [0, 1, 2],
    description: 'Array of image indices from uploaded files',
    required: false,
    type: [Number],
  })
  @Expose()
  @IsOptional()
  @IsArray({ message: 'Image indices must be an array' })
  @IsInt({ each: true, message: 'Each image index must be an integer' })
  @Type(() => Number)
  imageIndices?: number[];
}
