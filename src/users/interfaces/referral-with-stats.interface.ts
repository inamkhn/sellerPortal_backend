export interface ReferralWithStats {
  id: number;
  referredUserId: number;
  referredUserName: string;
  referredUserEmail: string;
  registrationDate: Date;
  orderCount: number;
  totalRevenue: number;
}
