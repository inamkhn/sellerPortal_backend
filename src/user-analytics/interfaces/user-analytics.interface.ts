export interface ReferralStats {
  totalReferrals: number;
  referralCode: string;
}

export interface MonthlyEarnings {
  month: string; // Format: YYYY-MM
  earnings: number;
}

export interface CategorySales {
  category: string;
  orderCount: number;
}

export interface RecentOrder {
  id: number;
  customerName: string;
  productName: string;
  decidedPrice: number;
  status: string;
  createdAt: Date;
  customerPhone: string;
  customerEmail: string;
}

export interface UserAnalyticsData {
  totalEarnings: number;
  totalProducts: number;
  totalOrders: number;
  referralStats: ReferralStats;
  monthlyEarnings: MonthlyEarnings[];
  categorySales: CategorySales[];
  recentOrders: RecentOrder[];
}

export interface UserAnalyticsResponse {
  success: boolean;
  data: UserAnalyticsData;
}

export interface EarningsCalculation {
  userShare: number;
  referrerShare: number;
  total: number;
}

export interface AnalyticsMetrics {
  earnings: number;
  productCount: number;
  orderCount: number;
  referralCount: number;
  referralCode: string | null;
}
