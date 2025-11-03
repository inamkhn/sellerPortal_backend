import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { OrderSettlementService } from './order-settlement.service';
import {
  CreateSettlementDto,
  UpdateSettlementDto,
  SettlementQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators';
import { User, Role } from '@prisma/client';

@ApiTags('Order Settlements')
@Controller('order-settlements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderSettlementController {
  constructor(
    private readonly orderSettlementService: OrderSettlementService,
  ) {}

  // ==================== ADMIN ENDPOINTS ====================

  @Post('admin')
  @ApiOperation({ summary: 'Create settlement (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Settlement created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Order request not found' })
  async createSettlement(
    @Body() dto: CreateSettlementDto,
    @GetUser() user: User,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can create settlements');
    }
    return this.orderSettlementService.createSettlement(dto, user.id);
  }

  // ==================== USER/SELLER ENDPOINTS ====================
  // Note: These must come BEFORE the generic /:id route to avoid route conflicts

  @Get('my-settlements')
  @ApiOperation({ summary: 'Get my settlements (User/Referral Manager)' })
  @ApiResponse({ status: 200, description: 'My settlements retrieved' })
  async getMySettlements(
    @Query() query: SettlementQueryDto,
    @GetUser() user: User,
  ) {
    return this.orderSettlementService.findAll(query, user.id, user.role);
  }

  @Get('my-settlements/:id')
  @ApiOperation({
    summary: 'Get my settlement details (User/Referral Manager)',
  })
  @ApiResponse({ status: 200, description: 'Settlement details retrieved' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async getMySettlementDetails(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.orderSettlementService.findOne(id, user.id, user.role);
  }

  // ==================== ADMIN ENDPOINTS (Generic routes) ====================

  @Get('/admin')
  @ApiOperation({ summary: 'Get all settlements (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settlements retrieved' })
  async findAllSettlements(
    @Query() query: SettlementQueryDto,
    @GetUser() user: User,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view all settlements');
    }
    return this.orderSettlementService.findAll(query, user.id, user.role);
  }

  @Get('/admin/:id')
  @ApiOperation({ summary: 'Get settlement details (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settlement details retrieved' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async findOneSettlement(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can view settlement details');
    }
    return this.orderSettlementService.findOne(id, user.id, user.role);
  }

  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update settlement (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settlement updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async updateSettlement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSettlementDto,
    @GetUser() user: User,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can update settlements');
    }
    return this.orderSettlementService.update(id, dto, user.id);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete settlement (Admin only)' })
  @ApiResponse({ status: 204, description: 'Settlement deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete paid settlement' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async removeSettlement(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete settlements');
    }
    return this.orderSettlementService.remove(id, user.id);
  }

  // ==================== REFERRAL MANAGER ENDPOINTS ====================

  @Get('referral-manager/pending')
  @ApiOperation({
    summary: 'Get pending commissions (Referral Manager only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending commissions retrieved',
    schema: {
      example: [
        {
          id: 1,
          orderId: 'ORD-001',
          sellerName: 'Ahmed Khan',
          orderAmount: 5000,
          grossSellerAmount: 4500,
          commissionRate: null,
          commissionAmount: null,
          settlementDate: '2024-10-20T10:30:00Z',
          status: 'PENDING',
        },
      ],
    },
  })
  async getPendingCommissions(@GetUser() user: User) {
    if (user.role !== Role.REFERRAL_MANAGER) {
      throw new ForbiddenException(
        'Only referral managers can view pending commissions',
      );
    }
    return this.orderSettlementService.getPendingCommissions(user.id);
  }

  @Post('referral-manager/:id/set-commission')
  @ApiOperation({
    summary: 'Set commission rate (Referral Manager only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Commission rate set successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async setCommissionRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { commissionRate: number; notes?: string },
    @GetUser() user: User,
  ) {
    if (user.role !== Role.REFERRAL_MANAGER) {
      throw new ForbiddenException(
        'Only referral managers can set commission rates',
      );
    }
    return this.orderSettlementService.setCommissionRate(
      id,
      body.commissionRate,
      user.id,
      body.notes,
    );
  }
}
