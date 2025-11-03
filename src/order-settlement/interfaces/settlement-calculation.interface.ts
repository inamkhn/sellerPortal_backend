import { Decimal } from '@prisma/client/runtime/library';
import { Role } from '@prisma/client';

export interface SettlementCalculationResult {
  totalAmount: Decimal;
  productCost: Decimal;
  adminCommission: Decimal;
  grossSellerAmount: Decimal;
  netSellerAmount: Decimal;
  referralCommission: Decimal | null;
  referralCommissionRate: Decimal | null;
  isFixedCommission: boolean;
  referrerId: number | null;
  referrerRole: Role | null;
}
