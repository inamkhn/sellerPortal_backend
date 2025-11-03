import {
  SettlementConfig,
  DEFAULT_SETTLEMENT_CONFIG,
} from '../interfaces/settlement-config.interface';

export class SettlementConfigHelper {
  private static config: SettlementConfig | null = null;

  static getConfig(): SettlementConfig {
    if (this.config) {
      return this.config;
    }

    this.config = {
      adminCommissionRate: this.parseNumber(
        process.env.ADMIN_COMMISSION_RATE,
        DEFAULT_SETTLEMENT_CONFIG.adminCommissionRate,
      ),
      adminCommissionType: this.parseCommissionType(
        process.env.ADMIN_COMMISSION_TYPE,
        DEFAULT_SETTLEMENT_CONFIG.adminCommissionType,
      ),
      adminCommissionFixed: this.parseNumber(
        process.env.ADMIN_COMMISSION_FIXED,
        DEFAULT_SETTLEMENT_CONFIG.adminCommissionFixed,
      ),
      referralUserCommissionRate: this.parseNumber(
        process.env.REFERRAL_USER_COMMISSION_RATE,
        DEFAULT_SETTLEMENT_CONFIG.referralUserCommissionRate,
      ),
      referralManagerCommissionRate: this.parseNumber(
        process.env.REFERRAL_MANAGER_COMMISSION_RATE,
        DEFAULT_SETTLEMENT_CONFIG.referralManagerCommissionRate,
      ),
      referralCommissionType: this.parseCommissionType(
        process.env.REFERRAL_COMMISSION_TYPE,
        DEFAULT_SETTLEMENT_CONFIG.referralCommissionType,
      ),
      referralCommissionFixed: this.parseNumber(
        process.env.REFERRAL_COMMISSION_FIXED,
        DEFAULT_SETTLEMENT_CONFIG.referralCommissionFixed,
      ),
    };

    return this.config;
  }

  private static parseNumber(
    value: string | undefined,
    defaultValue: number,
  ): number {
    if (!value) {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private static parseCommissionType(
    value: string | undefined,
    defaultValue: 'percentage' | 'fixed',
  ): 'percentage' | 'fixed' {
    if (value === 'percentage' || value === 'fixed') {
      return value;
    }
    return defaultValue;
  }

  static resetConfig(): void {
    this.config = null;
  }
}
