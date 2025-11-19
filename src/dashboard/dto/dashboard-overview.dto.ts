import { ApiProperty } from '@nestjs/swagger';

class StatsDto {
  @ApiProperty({ example: 188 })
  totalOrders: number;

  @ApiProperty({ example: 8 })
  pendingOrders: number;

  @ApiProperty({ example: 156 })
  completedOrders: number;

  @ApiProperty({ example: 24 })
  cancelledOrders: number;

  @ApiProperty({ example: 45231.89 })
  totalEarnings: number;

  @ApiProperty({ example: 8850.5 })
  thisMonthEarnings: number;

  @ApiProperty({ example: 12 })
  ordersThisWeek: number;

  @ApiProperty({ example: 1234.56 })
  averageOrderValue: number;

  @ApiProperty({ example: 82.9 })
  successRate: number;

  @ApiProperty({ example: 5000.0 })
  pendingSettlementAmount: number;
}

class TrendsDto {
  @ApiProperty({ example: 8.5 })
  ordersGrowth: number;

  @ApiProperty({ example: 20.1 })
  earningsGrowth: number;

  @ApiProperty({ example: 2.3 })
  completionRateChange: number;
}

class PayoutDto {
  @ApiProperty({ example: true })
  canRequestPayout: boolean;

  @ApiProperty({ example: '2024-01-15T00:00:00Z' })
  nextPayoutDate: string;
}

export class DashboardOverviewDto {
  @ApiProperty({ type: StatsDto })
  stats: StatsDto;

  @ApiProperty({ type: TrendsDto })
  trends: TrendsDto;

  @ApiProperty({ type: PayoutDto })
  payout: PayoutDto;
}
