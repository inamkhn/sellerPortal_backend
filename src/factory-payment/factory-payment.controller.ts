import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { FactoryPaymentService } from './factory-payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { IsNumber, IsPositive } from 'class-validator';

export class AddPaymentDto {
  @IsNumber()
  amount: number;
}

@Controller('factory-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FactoryPaymentController {
  constructor(private readonly factoryPaymentService: FactoryPaymentService) {}

  @Get('summary')
  async getSummary() {
    return this.factoryPaymentService.getSummary();
  }

  @Get('orders')
  async getOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.factoryPaymentService.getDeliveredOrders(
      Number(page),
      Number(limit),
    );
  }

  @Get('history')
  async getHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.factoryPaymentService.getHistory(Number(page), Number(limit));
  }

  @Post('add')
  async addPayment(@GetUser() user: User, @Body() dto: AddPaymentDto) {
    return this.factoryPaymentService.addPayment(dto.amount, user.id);
  }
}
