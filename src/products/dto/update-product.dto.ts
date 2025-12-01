import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({
    description:
      'Whether to replace all existing photos with new ones. If false, new photos will be added to existing ones.',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'replacePhotos must be a boolean value' })
  @Type(() => Boolean)
  replacePhotos?: boolean;

  @ApiProperty({
    description: 'Array of photo URLs to remove from the product.',
    example: ['http://example.com/photo1.jpg', 'http://example.com/photo2.jpg'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'photosToRemove must be an array' })
  @IsString({ each: true, message: 'Each photo URL must be a string' })
  photosToRemove?: string[];
}
