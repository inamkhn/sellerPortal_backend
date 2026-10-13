import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { ReferralQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@ApiTags('Referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all referrals for current user' })
  @ApiResponse({
    status: 200,
    description: 'Referrals retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Ahmed Khan',
            email: 'ahmed@example.com',
            phone: '+971 50 1234567',
            joinDate: '2024-09-15T10:30:00Z',
            totalOrders: 5,
            totalOrderValue: 25000,
            commissionEarned: 2500,
            status: 'ACTIVE',
            referralCode: 'REF-001',
          },
        ],
        meta: {
          total: 10,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
        stats: {
          totalReferrals: 10,
          activeReferrals: 8,
          totalOrders: 45,
          totalCommission: 12500,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@GetUser() user: User, @Query() query: ReferralQueryDto) {
    return this.referralsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get referral details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Referral details retrieved successfully',
    schema: {
      example: {
        id: 1,
        name: 'Ahmed Khan',
        email: 'ahmed@example.com',
        phone: '+971 50 1234567',
        joinDate: '2024-09-15T10:30:00Z',
        totalOrders: 5,
        completedOrders: 4,
        totalOrderValue: 25000,
        totalSalesValue: 25000,
        commissionEarned: 2500,
        totalCommission: 2500,
        status: 'ACTIVE',
        referralCode: 'REF-001',
        orders: [
          {
            id: 'ORD-123',
            orderDate: '2024-09-20T10:30:00Z',
            amount: 5000,
            status: 'DELIVERED',
            commission: 500,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Referral not found' })
  async findOne(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) referralId: number,
  ) {
    return this.referralsService.findOne(user.id, referralId);
  }
}
