import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Role } from '@prisma/client';
import { SettlementCalculationResult } from './interfaces/settlement-calculation.interface';
import { SettlementConfigHelper } from './config/settlement-config.helper';

@Injectable()
export class SettlementCalculationService {
  private readonly logger = new Logger(SettlementCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateSettlement(
    decidedPrice: Decimal,
    sellerId: number,
  ): Promise<SettlementCalculationResult> {
    this.logger.debug(`Calculating settlement for seller ${sellerId}`);

    const totalAmount = new Decimal(decidedPrice.toString());

    // Calculate admin commission
    const adminCommission = this.calculateAdminCommission(totalAmount);
    const productCost = totalAmount.minus(adminCommission);
    const grossSellerAmount = productCost;

    // Get seller profile to check for referrer
    const sellerProfile = await this.prisma.profile.findUnique({
      where: { userId: sellerId },
      include: {
        referrer: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    let referralCommission: Decimal | null = null;
    let referralCommissionRate: Decimal | null = null;
    let referrerId: number | null = null;
    let referrerRole: Role | null = null;
    let netSellerAmount: Decimal;

    // Calculate referral commission if referrer exists
    if (sellerProfile?.referredBy && sellerProfile.referrer) {
      referrerId = sellerProfile.referrer.id;
      referrerRole = sellerProfile.referrer.role;

      const commissionRate = this.getReferralCommissionRate(referrerRole);
      referralCommissionRate = new Decimal(commissionRate);

      referralCommission = this.calculateReferralCommission(
        grossSellerAmount,
        referrerRole,
      );

      netSellerAmount = grossSellerAmount.minus(referralCommission);

      this.logger.debug(
        `Referrer found: ID ${referrerId}, Role ${referrerRole}, Commission ${referralCommission.toString()}`,
      );
    } else {
      netSellerAmount = grossSellerAmount;
      this.logger.debug('No referrer found for seller');
    }

    const result: SettlementCalculationResult = {
      totalAmount,
      productCost,
      adminCommission,
      grossSellerAmount,
      netSellerAmount,
      referralCommission,
      referralCommissionRate,
      isFixedCommission: this.isFixedCommission(),
      referrerId,
      referrerRole,
    };

    this.logger.debug('Settlement calculation complete', {
      totalAmount: result.totalAmount.toString(),
      adminCommission: result.adminCommission.toString(),
      netSellerAmount: result.netSellerAmount.toString(),
    });

    return result;
  }

  private calculateAdminCommission(totalAmount: Decimal): Decimal {
    const config = SettlementConfigHelper.getConfig();

    if (config.adminCommissionType === 'fixed') {
      return new Decimal(config.adminCommissionFixed);
    }

    // Percentage-based commission
    const rate = new Decimal(config.adminCommissionRate).dividedBy(100);
    return totalAmount.times(rate);
  }

  private calculateReferralCommission(
    grossSellerAmount: Decimal,
    referrerRole: Role,
  ): Decimal {
    const config = SettlementConfigHelper.getConfig();

    if (config.referralCommissionType === 'fixed') {
      return new Decimal(config.referralCommissionFixed);
    }

    // Percentage-based commission
    const commissionRate = this.getReferralCommissionRate(referrerRole);
    const rate = new Decimal(commissionRate).dividedBy(100);
    return grossSellerAmount.times(rate);
  }

  private getReferralCommissionRate(referrerRole: Role): number {
    const config = SettlementConfigHelper.getConfig();

    if (referrerRole === 'REFERRAL_MANAGER') {
      return config.referralManagerCommissionRate;
    }

    // Default to USER rate
    return config.referralUserCommissionRate;
  }

  private isFixedCommission(): boolean {
    const config = SettlementConfigHelper.getConfig();
    return config.adminCommissionType === 'fixed';
  }
}
