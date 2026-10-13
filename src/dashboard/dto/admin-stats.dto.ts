import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty({ description: 'Total registered users' })
  totalUsers: number;

  @ApiProperty({ description: 'Users registered last month' })
  lastMonthUsers: number;

  @ApiProperty({ description: 'User growth percentage' })
  usersGrowth: number;

  @ApiProperty({ description: 'Total orders this month' })
  totalOrders: number;

  @ApiProperty({ description: 'Orders with PENDING status' })
  pendingOrders: number;

  @ApiProperty({ description: 'Orders created today' })
  ordersToday: number;

  @ApiProperty({ description: 'Order growth percentage' })
  ordersGrowth: number;

  @ApiProperty({
    description: 'Total revenue from last month DELIVERED orders',
  })
  totalRevenue: number;

  @ApiProperty({ description: 'Admin commission from last month' })
  adminCommission: number;

  @ApiProperty({ description: 'Revenue growth percentage' })
  revenueGrowth: number;

  @ApiProperty({ description: 'Commission growth percentage' })
  commissionGrowth: number;

  @ApiProperty({ description: 'Count of PENDING order settlements' })
  pendingSettlements: number;

  @ApiProperty({ description: 'Users with role USER who have order requests' })
  activeSellers: number;

  @ApiProperty({ description: 'Success rate (DELIVERED / total orders) * 100' })
  successRate: number;
}
