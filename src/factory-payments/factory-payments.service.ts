import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/database.service';
import {
  CreateFactoryPaymentDto,
  FactoryPaymentSummaryDto,
  OrderWithPaymentStatusDto,
} from './dto/factory-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class FactoryPaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get summary statistics for factory payments
   */
  async getFactoryPaymentsSummary(): Promise<FactoryPaymentSummaryDto> {
    // Get all delivered orders with their settlements and payments
    const deliveredOrders = await this.prisma.orderRequest.findMany({
      where: {
        status: OrderStatus.DELIVERED,
      },
      include: {
        orderSettlements: true,
        factoryPayments: true,
      },
    });

    let totalOwed = new Decimal(0);
    let totalPaid = new Decimal(0);

    for (const order of deliveredOrders) {
      const settlement = order.orderSettlements[0];
      if (!settlement) continue;

      // Calculate what factory owes for this order
      const factoryReceivedFromCustomer =
        order.advanceReceivedBy === 'ADMIN'
          ? order.decidedPrice.sub(order.advancePay || 0)
          : order.decidedPrice;

      const factoryKeeps = settlement.productCost;
      const orderOwed = factoryReceivedFromCustomer.sub(factoryKeeps);

      // Sum of payments made for this order
      const orderPaid = order.factoryPayments.reduce(
        (sum: Decimal, payment: any) => sum.add(payment.amount),
        new Decimal(0),
      );

      totalOwed = totalOwed.add(orderOwed);
      totalPaid = totalPaid.add(orderPaid);
    }

    const pendingBalance = totalOwed.sub(totalPaid);

    return {
      totalOwed: totalOwed.toNumber(),
      totalPaid: totalPaid.toNumber(),
      pendingBalance: pendingBalance.toNumber(),
      totalDeliveredOrders: deliveredOrders.length,
    };
  }

  /**
   * Get paginated list of delivered orders with payment status
   */
  async getOrdersWithPaymentStatus(
    page: number = 1,
    limit: number = 10,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      paymentStatus?: 'FULLY_PAID' | 'PARTIAL' | 'PENDING';
      advanceRecipient?: 'FACTORY' | 'ADMIN' | 'NONE';
      search?: string;
    },
  ): Promise<{ orders: OrderWithPaymentStatusDto[]; total: number }> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: OrderStatus.DELIVERED,
    };

    if (filters?.dateFrom || filters?.dateTo) {
      where.deliveryDate = {};
      if (filters.dateFrom) where.deliveryDate.gte = filters.dateFrom;
      if (filters.dateTo) where.deliveryDate.lte = filters.dateTo;
    }

    if (filters?.advanceRecipient) {
      where.advanceReceivedBy = filters.advanceRecipient;
    }

    if (filters?.search) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { id: { equals: parseInt(filters.search) || undefined } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.orderRequest.findMany({
        where,
        include: {
          orderSettlements: true,
          factoryPayments: {
            orderBy: { paidAt: 'desc' },
          },
        },
        orderBy: { deliveryDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.orderRequest.count({ where }),
    ]);

    const ordersWithPaymentStatus: OrderWithPaymentStatusDto[] = orders.map(
      (order: any) => {
        const settlement = order.orderSettlements[0];

        // Calculate amounts
        const factoryReceivedFromCustomer =
          order.advanceReceivedBy === 'ADMIN'
            ? order.decidedPrice.sub(order.advancePay || 0)
            : order.decidedPrice;

        const factoryKeeps = settlement?.productCost || new Decimal(0);
        const totalOwed = factoryReceivedFromCustomer.sub(factoryKeeps);

        const totalPaid = order.factoryPayments.reduce(
          (sum: Decimal, payment: any) => sum.add(payment.amount),
          new Decimal(0),
        );

        const balance = totalOwed.sub(totalPaid);

        // Determine payment status
        let paymentStatus: 'FULLY_PAID' | 'PARTIAL' | 'PENDING';
        if (balance.lte(0)) {
          paymentStatus = 'FULLY_PAID';
        } else if (totalPaid.gt(0)) {
          paymentStatus = 'PARTIAL';
        } else {
          paymentStatus = 'PENDING';
        }

        return {
          id: order.id,
          customerName: order.customerName,
          deliveryDate: order.deliveryDate,
          decidedPrice: order.decidedPrice.toNumber(),
          productCost: settlement?.productCost.toNumber() || 0,
          advancePay: order.advancePay?.toNumber() || 0,
          advanceReceivedBy: order.advanceReceivedBy || 'NONE',
          totalOwed: totalOwed.toNumber(),
          totalPaid: totalPaid.toNumber(),
          balance: balance.toNumber(),
          paymentStatus,
          paymentsCount: order.factoryPayments.length,
        };
      },
    );

    // Apply payment status filter if provided
    const filteredOrders = filters?.paymentStatus
      ? ordersWithPaymentStatus.filter(
          (order) => order.paymentStatus === filters.paymentStatus,
        )
      : ordersWithPaymentStatus;

    return {
      orders: filteredOrders,
      total: filters?.paymentStatus ? filteredOrders.length : total,
    };
  }

  /**
   * Record a new payment from factory
   */
  async recordFactoryPayment(dto: CreateFactoryPaymentDto) {
    // Verify order exists and is delivered
    const order = await this.prisma.orderRequest.findFirst({
      where: {
        id: dto.orderRequestId,
        status: OrderStatus.DELIVERED,
      },
      include: {
        orderSettlements: true,
        factoryPayments: true,
      },
    });

    if (!order) {
      throw new Error('Order not found or not delivered');
    }

    const settlement = order.orderSettlements[0];
    if (!settlement) {
      throw new Error('Order settlement not found');
    }

    // Calculate remaining balance
    const factoryReceivedFromCustomer =
      (order as any).advanceReceivedBy === 'ADMIN'
        ? order.decidedPrice.sub(order.advancePay || 0)
        : order.decidedPrice;

    const factoryKeeps = settlement.productCost;
    const totalOwed = factoryReceivedFromCustomer.sub(factoryKeeps);

    const totalPaid = (order as any).factoryPayments.reduce(
      (sum: Decimal, payment: any) => sum.add(payment.amount),
      new Decimal(0),
    );

    const remainingBalance = totalOwed.sub(totalPaid);

    // Validate payment amount
    if (new Decimal(dto.amount).gt(remainingBalance)) {
      throw new Error(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remainingBalance.toNumber()})`,
      );
    }

    // Create payment record
    const payment = await (this.prisma as any).factoryPayment.create({
      data: {
        orderRequestId: dto.orderRequestId,
        amount: new Decimal(dto.amount),
        paidAt: dto.paidAt || new Date(),
        paymentProof: dto.paymentProof,
        notes: dto.notes,
      },
      include: {
        orderRequest: {
          include: {
            orderSettlements: true,
          },
        },
      },
    });

    return payment;
  }

  /**
   * Get payment details for a specific order
   */
  async getOrderPaymentDetails(orderRequestId: number) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { id: orderRequestId },
      include: {
        orderSettlements: true,
        factoryPayments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const settlement = order.orderSettlements[0];

    // Calculate amounts
    const factoryReceivedFromCustomer =
      (order as any).advanceReceivedBy === 'ADMIN'
        ? order.decidedPrice.sub(order.advancePay || 0)
        : order.decidedPrice;

    const factoryKeeps = settlement?.productCost || new Decimal(0);
    const totalOwed = factoryReceivedFromCustomer.sub(factoryKeeps);

    const totalPaid = (order as any).factoryPayments.reduce(
      (sum: Decimal, payment: any) => sum.add(payment.amount),
      new Decimal(0),
    );

    const balance = totalOwed.sub(totalPaid);

    // Calculate running balance for each payment
    const paymentsWithRunningBalance: any[] = [];
    let runningBalance = totalOwed;

    for (const payment of [...(order as any).factoryPayments].reverse()) {
      runningBalance = runningBalance.sub(payment.amount);
      paymentsWithRunningBalance.unshift({
        ...payment,
        amount: payment.amount.toNumber(),
        runningBalanceAfter: runningBalance.toNumber(),
      });
    }

    return {
      order: {
        id: order.id,
        customerName: order.customerName,
        deliveryDate: order.deliveryDate,
        decidedPrice: order.decidedPrice.toNumber(),
        productCost: settlement?.productCost.toNumber() || 0,
        advancePay: order.advancePay?.toNumber() || 0,
        advanceReceivedBy: (order as any).advanceReceivedBy || 'NONE',
      },
      calculations: {
        factoryReceivedFromCustomer: factoryReceivedFromCustomer.toNumber(),
        factoryKeeps: factoryKeeps.toNumber(),
        totalOwed: totalOwed.toNumber(),
        totalPaid: totalPaid.toNumber(),
        balance: balance.toNumber(),
      },
      payments: paymentsWithRunningBalance,
    };
  }

  /**
   * Get payment history with filters
   */
  async getPaymentHistory(
    page: number = 1,
    limit: number = 10,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      orderRequestId?: number;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.dateFrom || filters?.dateTo) {
      where.paidAt = {};
      if (filters.dateFrom) where.paidAt.gte = filters.dateFrom;
      if (filters.dateTo) where.paidAt.lte = filters.dateTo;
    }

    if (filters?.orderRequestId) {
      where.orderRequestId = filters.orderRequestId;
    }

    const [payments, total] = await Promise.all([
      (this.prisma as any).factoryPayment.findMany({
        where,
        include: {
          orderRequest: {
            select: {
              id: true,
              customerName: true,
              deliveryDate: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma as any).factoryPayment.count({ where }),
    ]);

    return {
      payments: payments.map((payment: any) => ({
        ...payment,
        amount: payment.amount.toNumber(),
      })),
      total,
    };
  }

  /**
   * Delete a payment record (for corrections)
   */
  async deleteFactoryPayment(paymentId: number) {
    const payment = await (this.prisma as any).factoryPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    await (this.prisma as any).factoryPayment.delete({
      where: { id: paymentId },
    });

    return { message: 'Payment deleted successfully' };
  }
}
