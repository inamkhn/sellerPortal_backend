import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto, DashboardOverviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
}
