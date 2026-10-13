import { ApiProperty } from '@nestjs/swagger';
import { OrderRequestResponseDto } from './order-request-response.dto';

export class PaginatedOrderRequestsDto {
  @ApiProperty({ type: [OrderRequestResponseDto] })
  orderRequests: OrderRequestResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
