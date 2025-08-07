import { Controller, Get, UseGuards, UseFilters } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { UserAnalyticsService } from './user-analytics.service';
import { UserAnalyticsResponseDto } from './dto/user-analytics-response.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { UserAnalyticsExceptionFilter } from './filters/user-analytics-exception.filter';

@ApiTags('User Analytics')
@Controller('api/v1/user/analytics')
@UseGuards(JwtAuthGuard)
@UseFilters(UserAnalyticsExceptionFilter)
@ApiBearerAuth()
export class UserAnalyticsController {
  constructor(private readonly userAnalyticsService: UserAnalyticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user analytics dashboard',
    description:
      'Retrieve comprehensive analytics including earnings, products, orders, and referrals for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User analytics retrieved successfully',
    type: UserAnalyticsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async getUserAnalytics(
    @GetUser() user: User,
  ): Promise<UserAnalyticsResponseDto> {
    const analyticsData =
      await this.userAnalyticsService.calculateUserAnalytics(user.id);

    return {
      success: true,
      data: analyticsData,
    };
  }
}
