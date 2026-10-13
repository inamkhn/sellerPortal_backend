export interface SettlementConfig {
  adminCommissionRate: number;
  adminCommissionType: 'percentage' | 'fixed';
  adminCommissionFixed: number;
  referralUserCommissionRate: number;
  referralManagerCommissionRate: number;
  referralCommissionType: 'percentage' | 'fixed';
  referralCommissionFixed: number;
}

export const DEFAULT_SETTLEMENT_CONFIG: SettlementConfig = {
  adminCommissionRate: 10,
  adminCommissionType: 'percentage',
  adminCommissionFixed: 0,
  referralUserCommissionRate: 5,
  referralManagerCommissionRate: 7,
  referralCommissionType: 'percentage',
  referralCommissionFixed: 0,
};
