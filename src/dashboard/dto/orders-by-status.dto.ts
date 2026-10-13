import { ApiProperty } from '@nestjs/swagger';

export class OrdersByStatusDataPoint {
  @ApiProperty({ description: 'Status label' })
  label: string;

  @ApiProperty({ description: 'Number of orders with this status' })
  value: number;

  @ApiProperty({ description: 'Color for chart display' })
  color: string;
}

export class OrdersByStatusDto {
  @ApiProperty({
    type: [OrdersByStatusDataPoint],
    description: 'Order distribution by status',
  })
  data: OrdersByStatusDataPoint[];
}
