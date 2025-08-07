import { ApiProperty } from '@nestjs/swagger';

export class ReferralStatsDto {
  @ApiProperty({
    description: 'Total number of users referred by this user',
    example: 5,
  })
  totalReferrals: number;

  @ApiProperty({
    description: 'User referral code for inviting others',
    example: 'REF123ABC',
  })
  referralCode: string;
}

export class MonthlyEarningsDto {
  @ApiProperty({
    description: 'Month in YYYY-MM format',
    example: '2024-01',
  })
  month: string;

  @ApiProperty({
    description: 'Total earnings for the month',
    example: 450.25,
  })
  earnings: number;
}

export class CategorySalesDto {
  @ApiProperty({
    description: 'Product category name',
    example: 'CHAIRS',
  })
  category: string;

  @ApiProperty({
    description: 'Number of orders in this category',
    example: 3,
  })
  orderCount: number;
}

export class RecentOrderDto {
  @ApiProperty({
    description: 'Order ID',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  customerName: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wooden Chair',
  })
  productName: string;

  @ApiProperty({
    description: 'Decided price for the order',
    example: 299.99,
  })
  decidedPrice: number;

  @ApiProperty({
    description: 'Order status',
    example: 'CONFIRMED',
  })
  status: string;

  @ApiProperty({
    description: 'Order creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+1234567890',
  })
  customerPhone: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  customerEmail: string;
}

export class UserAnalyticsDataDto {
  @ApiProperty({
    description: 'Total earnings from all completed orders and referrals',
    example: 1250.75,
  })
  totalEarnings: number;

  @ApiProperty({
    description: 'Total number of products listed by the user',
    example: 12,
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Total number of orders received for user products',
    example: 8,
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Referral statistics for the user',
    type: ReferralStatsDto,
  })
  referralStats: ReferralStatsDto;

  @ApiProperty({
    description: 'Monthly earnings breakdown for the last 12 months',
    type: [MonthlyEarningsDto],
  })
  monthlyEarnings: MonthlyEarningsDto[];

  @ApiProperty({
    description: 'Sales breakdown by product category',
    type: [CategorySalesDto],
  })
  categorySales: CategorySalesDto[];

  @ApiProperty({
    description: 'Recent orders (last 10)',
    type: [RecentOrderDto],
  })
  recentOrders: RecentOrderDto[];
}

export class UserAnalyticsResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User analytics data',
    type: UserAnalyticsDataDto,
  })
  data: UserAnalyticsDataDto;
}
