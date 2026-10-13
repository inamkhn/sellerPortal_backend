import { ApiProperty } from '@nestjs/swagger';

class PayoutRequestDataDto {
  @ApiProperty({
    description: 'Payout amount',
    example: 5000.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Request timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  requestedAt: string;
}

export class PayoutRequestResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Payout request submitted successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Payout request data',
    type: PayoutRequestDataDto,
  })
  data: PayoutRequestDataDto;
}
