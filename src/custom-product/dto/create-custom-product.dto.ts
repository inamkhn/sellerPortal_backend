import { IsString, IsInt, IsOptional, Length, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateCustomProductDto {
  @ApiProperty({
    example: 'Custom L-Shaped Leather Sofa',
    minLength: 3,
    maxLength: 100,
  })
  @IsString({ message: 'Product name must be a string' })
  @Length(3, 100, {
    message: 'Product name must be between 3 and 100 characters',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

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
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @ApiProperty({
    example: 4,
    description: 'Category ID',
  })
  @IsInt({ message: 'Category ID must be an integer' })
  @Min(1, { message: 'Category ID must be at least 1' })
  @Type(() => Number)
  categoryId: number;
}
