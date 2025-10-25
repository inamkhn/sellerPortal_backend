import { ApiProperty } from '@nestjs/swagger';

class CategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Furniture' })
  name: string;
}

export class CustomProductResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 123 })
  orderRequestId: number;

  @ApiProperty({ example: 'Custom L-Shaped Leather Sofa' })
  name: string;

  @ApiProperty({ example: 'Brown leather, 8-seater, with reclining feature' })
  description: string | null;

  @ApiProperty({ example: 4 })
  categoryId: number;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    type: [String],
  })
  images: string[];

  @ApiProperty({ type: CategoryDto })
  category: CategoryDto;

  @ApiProperty({ example: '2024-10-19T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-10-19T10:30:00.000Z' })
  updatedAt: Date;
}
