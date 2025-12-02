import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DashboardQueryDto,
  DashboardOverviewDto,
  AdminStatsDto,
  RevenueTrendDto,
  RevenueTrendQueryDto,
  OrdersByStatusDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview statistics',
    description:
      'Returns comprehensive dashboard statistics including orders, earnings, and trends. Data is filtered based on user role (ADMIN sees all, REFERRAL_MANAGER sees own + referrals, USER sees only own).',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview retrieved successfully',
    type: DashboardOverviewDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverview(@GetUser() user: User, @Query() query: DashboardQueryDto) {
    const data = await this.dashboardService.getOverview(
      user.id,
      user.role,
      query.startDate,
      query.endDate,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get admin dashboard statistics',
    description:
      'Returns comprehensive admin dashboard statistics including users, orders, revenue, commission, and performance metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin stats retrieved successfully',
    type: AdminStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getAdminStats() {
    const data = await this.dashboardService.getAdminStats();

    return {
      success: true,
      data,
    };
  }

  @Get('admin/revenue-trend')
  @ApiOperation({
    summary: 'Get revenue trend data',
    description:
      'Returns monthly revenue data for the specified number of months.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue trend retrieved successfully',
    type: RevenueTrendDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRevenueTrend(
    @GetUser() user: User,
    @Query() query: RevenueTrendQueryDto,
  ) {
    const months = query.months || 12;
    const data = await this.dashboardService.getRevenueTrend(
      user.id,
      user.role,
      months,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('admin/orders-by-status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get orders distribution by status',
    description:
      'Returns order counts grouped by status for pie chart visualization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders by status retrieved successfully',
    type: OrdersByStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getOrdersByStatus() {
    const data = await this.dashboardService.getOrdersByStatus();

    return {
      success: true,
      data,
    };
  }
}
