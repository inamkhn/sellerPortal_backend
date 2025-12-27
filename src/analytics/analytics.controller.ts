import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  TopPerformersQueryDto,
} from './dto/analytics-query.dto';
import { DetailedReportsQueryDto } from './dto/detailed-reports-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators';
import { Role } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(Role.ADMIN)
@UseInterceptors(CacheInterceptor)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @CacheTTL(300) // Cache for 5 minutes
  async getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(query.dateRange);
  }

  @Get('top-performers')
  @CacheTTL(600) // Cache for 10 minutes
  async getTopPerformers(@Query() query: TopPerformersQueryDto) {
    return this.analyticsService.getTopPerformers(query.dateRange, query.limit);
  }

  @Get('detailed-reports')
  @CacheTTL(300) // Cache for 5 minutes
  async getDetailedReports(
    @Query() query: DetailedReportsQueryDto,
  ): Promise<any> {
    return this.analyticsService.getDetailedReports(
      query.dateRange,
      query.page,
      query.limit,
    );
  }
}

@Controller('analytics/user')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
export class UserAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @CacheTTL(300) // Cache for 5 minutes
  async getUserOverview(
    @Query() query: AnalyticsQueryDto,
    @GetUser() user: { id: number },
  ): Promise<any> {
    return await this.analyticsService.getUserOverview(
      user.id,
      query.dateRange,
    );
  }

  @Get('performance')
  @CacheTTL(300) // Cache for 5 minutes
  async getUserPerformance(
    @Query() query: DetailedReportsQueryDto,
    @GetUser() user: { id: number },
  ): Promise<any> {
    return await this.analyticsService.getUserPerformance(
      user.id,
      query.dateRange,
      query.page,
      query.limit,
    );
  }
}
