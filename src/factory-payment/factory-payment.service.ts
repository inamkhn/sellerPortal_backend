import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FactoryPaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get summary of factory payments
   * Calculates total owed from delivered orders and shows total paid
   */
  async getSummary() {
    // Get all delivered orders with their settlements (needed for accurate total calculation)
    const deliveredOrders = await this.prisma.orderRequest.findMany({
      where: { status: 'DELIVERED' },
      include: {
        orderSettlements: true,
      },
    });

    // Calculate total owed and categorize orders
    let totalOwed = new Decimal(0);
    let ordersWithCostCount = 0;
    let ordersWithoutCostCount = 0;

    for (const order of deliveredOrders) {
      const settlement = order.orderSettlements[0];
      
      if (settlement && settlement.productCost && Number(settlement.productCost) > 0) {
        // Order has product cost - can calculate
        const yourShare = new Decimal(order.decidedPrice).minus(settlement.productCost);
        totalOwed = totalOwed.plus(yourShare);
        ordersWithCostCount++;
      } else {
        // Order missing product cost
        ordersWithoutCostCount++;
      }
    }

    // Get total paid from factory
    let factoryPayment = await this.prisma.factoryPayment.findFirst();
    
    // Create record if doesn't exist
    if (!factoryPayment) {
      factoryPayment = await this.prisma.factoryPayment.create({
        data: { totalPaid: 0 },
      });
    }

    const totalPaid = Number(factoryPayment.totalPaid);
    const remaining = Number(totalOwed) - totalPaid;

    return {
      totalOwed: Number(totalOwed),
      totalPaid,
      remaining,
      totalOrders: deliveredOrders.length,
      ordersWithCostCount,
      ordersWithoutCostCount,
    };
  }

  /**
   * Get paginated delivered orders
   */
  async getDeliveredOrders(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await this.prisma.orderRequest.count({
      where: { status: 'DELIVERED' },
    });

    // Get paginated orders
    const orders = await this.prisma.orderRequest.findMany({
      where: { status: 'DELIVERED' },
      include: {
        orderSettlements: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Process orders
    const processedOrders = orders.map(order => {
        const settlement = order.orderSettlements[0];
        let productCost: number | null = null;
        let yourShare: number | null = null;
        let hasProductCost = false;

        if (settlement && settlement.productCost && Number(settlement.productCost) > 0) {
            productCost = Number(settlement.productCost);
            yourShare = Number(new Decimal(order.decidedPrice).minus(settlement.productCost));
            hasProductCost = true;
        }

        return {
            id: order.id,
            customerName: order.customerName,
            decidedPrice: Number(order.decidedPrice),
            productCost,
            yourShare,
            deliveryDate: order.deliveryDate,
            hasProductCost
        };
    });

    return {
        data: processedOrders,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    };
  }

  /**
   * Add payment from factory
   * @param amount Amount to add to total paid
   */
    async getHistory(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.factoryPaymentHistory.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          admin: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.factoryPaymentHistory.count(),
    ]);

    return {
      data: history,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add payment from factory
   * @param amount Amount to add to total paid
   * @param adminId ID of the admin recording the payment
   */
  async addPayment(amount: number, adminId: number) {
    // Get or create factory payment record
    let factoryPayment = await this.prisma.factoryPayment.findFirst();

    if (!factoryPayment) {
      factoryPayment = await this.prisma.factoryPayment.create({
        data: { totalPaid: 0 },
      });
    }

    // Add to total paid
    const newTotal = new Decimal(factoryPayment.totalPaid).plus(amount);

    const updated = await this.prisma.factoryPayment.update({
      where: { id: factoryPayment.id },
      data: { totalPaid: newTotal },
    });

    // Record history
    await this.prisma.factoryPaymentHistory.create({
      data: {
        factoryPaymentId: factoryPayment.id,
        amount,
        adminId,
      },
    });

    return {
      previousTotal: Number(factoryPayment.totalPaid),
      amountAdded: amount,
      newTotal: Number(updated.totalPaid),
    };
  }
}
