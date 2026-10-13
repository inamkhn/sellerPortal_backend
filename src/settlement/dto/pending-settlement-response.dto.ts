import { ApiProperty } from '@nestjs/swagger';

export class PendingSettlementResponseDto {
  @ApiProperty({
    description: 'Total pending settlement amount',
    example: 5000.0,
  })
  totalPending: number;

  @ApiProperty({
    description: 'Whether payout requests are currently allowed',
    example: true,
  })
  canRequestPayout: boolean;

  @ApiProperty({
    description: 'Next available payout date (ISO string)',
    example: '2024-01-15T00:00:00Z',
    nullable: true,
  })
  nextPayoutDate: string | null;

  @ApiProperty({
    description: 'Whether user has already requested payout today',
    example: false,
  })
  hasRequestedToday: boolean;
}
