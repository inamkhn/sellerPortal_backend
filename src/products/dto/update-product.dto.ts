import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
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
}
