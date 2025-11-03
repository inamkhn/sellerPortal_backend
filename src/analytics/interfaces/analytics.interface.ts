export interface MetricsData {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  platformCommission: number;
  commissionGrowth: number;
  activeUsers: number;
  usersGrowth: number;
  avgOrderValue: number;
  avgGrowth: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartsData {
  revenueOverTime: ChartDataPoint[];
  ordersByStatus: ChartDataPoint[];
  revenueByCategory: ChartDataPoint[];
}

export interface OverviewResponse {
  metrics: MetricsData;
  charts: ChartsData;
}

export interface TopPerformersResponse {
  topSellers: ChartDataPoint[];
  topProducts: ChartDataPoint[];
  topReferralManagers: ChartDataPoint[];
  referralManagerEarnings: ChartDataPoint[];
}

export interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SellerDetail {
  id: number;
  name: string;
  email: string;
  orders: number;
  revenue: number;
  commission: number;
}

export interface ProductDetail {
  id: number;
  name: string;
  category: string;
  sold: number;
  revenue: number;
  avgPrice: number;
}

export interface DetailedReportsResponse {
  topSellers: {
    data: SellerDetail[];
    pagination: PaginationMeta;
  };
  topProducts: {
    data: ProductDetail[];
    pagination: PaginationMeta;
  };
}
