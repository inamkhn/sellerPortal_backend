import { Controller, Get, UseGuards, UseFilters } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAnalyticsResponseDto } from './dto/admin-analytics-response.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { AdminAnalyticsExceptionFilter } from './filters/admin-analytics-exception.filter';

@ApiTags('Admin Analytics')
@Controller('api/v1/admin/analytics')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@UseFilters(AdminAnalyticsExceptionFilter)
@ApiBearerAuth()
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin analytics dashboard',
    description:
      'Retrieve comprehensive system-wide analytics including revenue, orders, users, and performance metrics. Requires admin privileges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin analytics retrieved successfully',
    type: AdminAnalyticsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async getAdminAnalytics(): Promise<AdminAnalyticsResponseDto> {
    const analyticsData =
      await this.adminAnalyticsService.calculateAdminAnalytics();

    return {
      success: true,
      data: analyticsData,
    };
  }
}
