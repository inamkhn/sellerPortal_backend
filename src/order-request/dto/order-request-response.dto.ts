import { ApiProperty } from '@nestjs/swagger';

export class OrderRequestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  userId: number;

  @ApiProperty({ example: 123, nullable: true })
  productId: number | null;

  @ApiProperty({ example: false })
  isCustomProduct: boolean;

  @ApiProperty({ example: 'FACEBOOK', nullable: true })
  platform: string | null;

  @ApiProperty({ example: '50000.00' })
  decidedPrice: string;

  @ApiProperty({ example: true })
  advancePayment: boolean;

  @ApiProperty({ example: '15000.00', nullable: true })
  advancePay: string | null;

  @ApiProperty({ example: 'Ahmed Khan' })
  customerName: string;

  @ApiProperty({ example: '+92 300 1234567' })
  customerPhone: string;

  @ApiProperty({ example: '+92 300 1234567' })
  customerWhatsapp: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  customerEmail: string;

  @ApiProperty({ example: 'Customer prefers morning delivery', nullable: true })
  customerNotes: string | null;

  @ApiProperty({ example: '123 Main Street, Karachi', nullable: true })
  deliveryAddress: string | null;

  @ApiProperty({ example: '2024-12-25T00:00:00.000Z', nullable: true })
  deliveryDate: Date | null;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: '2024-10-19T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-10-19T10:30:00.000Z' })
  updatedAt: Date;
}
