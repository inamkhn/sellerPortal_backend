export interface MonthlyRevenue {
  month: string; // Format: YYYY-MM
  revenue: number;
  orderCount: number;
}

export interface CategorySales {
  category: string;
  totalRevenue: number;
  orderCount: number;
}

export interface TopProduct {
  id: number;
  title: string;
  category: string;
  totalRevenue: number;
  orderCount: number;
  averagePrice: number;
}

export interface TopCustomer {
  id: number;
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
}

export interface AdminAnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  monthlyData: MonthlyRevenue[];
  salesByCategory: CategorySales[];
  topProducts: TopProduct[];
  topCustomers: TopCustomer[];
}

export interface AdminAnalyticsResponse {
  success: boolean;
  data: AdminAnalyticsData;
}
