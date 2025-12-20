import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FactoryPaymentsService } from './factory-payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateFactoryPaymentDto,
  GetOrdersQueryDto,
  GetPaymentHistoryQueryDto,
} from './dto/factory-payment.dto';

@Controller('factory-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FactoryPaymentsController {
  constructor(
    private readonly factoryPaymentsService: FactoryPaymentsService,
  ) {}

  /**
   * GET /factory-payments/summary
   * Get summary statistics (total owed, paid, pending)
   */
  @Get('summary')
  async getSummary() {
    return this.factoryPaymentsService.getFactoryPaymentsSummary();
  }

  /**
   * GET /factory-payments/orders
   * Get list of delivered orders with payment status
   */
  @Get('orders')
  async getOrders(@Query() query: GetOrdersQueryDto) {
    const filters: any = {};

    if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) filters.dateTo = new Date(query.dateTo);
    if (query.paymentStatus) filters.paymentStatus = query.paymentStatus;
    if (query.advanceRecipient)
      filters.advanceRecipient = query.advanceRecipient;
    if (query.search) filters.search = query.search;

    return this.factoryPaymentsService.getOrdersWithPaymentStatus(
      query.page,
      query.limit,
      filters,
    );
  }

  /**
   * GET /factory-payments/orders/:orderId
   * Get payment details for specific order
   */
  @Get('orders/:orderId')
  async getOrderDetails(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.factoryPaymentsService.getOrderPaymentDetails(orderId);
  }

  /**
   * POST /factory-payments
   * Record a new payment (supports partial amounts)
   */
  @Post()
  async recordPayment(@Body() dto: CreateFactoryPaymentDto) {
    return this.factoryPaymentsService.recordFactoryPayment(dto);
  }

  /**
   * GET /factory-payments/history
   * Get all payment transactions with filters
   */
  @Get('history')
  async getPaymentHistory(@Query() query: GetPaymentHistoryQueryDto) {
    const filters: any = {};

    if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) filters.dateTo = new Date(query.dateTo);
    if (query.orderRequestId) filters.orderRequestId = query.orderRequestId;

    return this.factoryPaymentsService.getPaymentHistory(
      query.page,
      query.limit,
      filters,
    );
  }

  /**
   * DELETE /factory-payments/:paymentId
   * Delete a payment record
   */
  @Delete(':paymentId')
  async deletePayment(@Param('paymentId', ParseIntPipe) paymentId: number) {
    return this.factoryPaymentsService.deleteFactoryPayment(paymentId);
  }
}
