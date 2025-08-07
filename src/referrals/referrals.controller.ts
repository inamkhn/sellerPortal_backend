import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser, Roles } from '../auth/decorators';
import { User, Role } from '@prisma/client';

@ApiTags('Referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Post('apply-code')
  @ApiOperation({
    summary: 'Apply referral code',
    description: 'Apply a referral code to link the current user to a referrer',
  })
  @ApiCreatedResponse({
    description: 'Referral code applied successfully',
    schema: {
      example: {
        id: 1,
        referrerId: 2,
        refereeId: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        referrer: {
          id: 2,
          email: 'referrer@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profile: {
            fullName: 'John Doe',
            referralCode: 'JOHN123',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid referral code or user already has a referrer',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid referral code or you already have a referrer',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async applyReferralCode(
    @GetUser() user: User,
    @Body() body: { referralCode: string },
  ) {
    if (!body.referralCode) {
      throw new BadRequestException('Referral code is required');
    }
    return this.referralsService.applyReferralCode(user.id, body.referralCode);
  }

  @Get('my-code')
  @ApiOperation({
    summary: 'Get my referral code',
    description: "Get the current user's referral code and referral statistics",
  })
  @ApiOkResponse({
    description: 'Referral code retrieved successfully',
    schema: {
      example: {
        referralCode: 'JOHN123',
        totalReferrals: 5,
        activeReferrals: 3,
        totalEarnings: 2500.0,
        pendingEarnings: 500.0,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getMyReferralCode(@GetUser() user: User) {
    return this.referralsService.getUserReferralInfo(user.id);
  }

  @Get('my-referrals')
  @ApiOperation({
    summary: 'Get my referrals',
    description: 'Get a list of users referred by the current user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Referrals retrieved successfully',
    schema: {
      example: {
        referrals: [
          {
            id: 1,
            refereeId: 3,
            createdAt: '2024-01-01T00:00:00.000Z',
            referee: {
              id: 3,
              email: 'referee@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
              profile: {
                fullName: 'Jane Smith',
                verified: true,
              },
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getMyReferrals(
    @GetUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.referralsService.getUserReferrals(user.id, page, limit);
  }

  @Get('earnings')
  @ApiOperation({
    summary: 'Get referral earnings',
    description:
      'Get detailed referral earnings information for the current user',
  })
  @ApiOkResponse({
    description: 'Referral earnings retrieved successfully',
    schema: {
      example: {
        totalEarnings: 2500.0,
        pendingEarnings: 500.0,
        paidEarnings: 2000.0,
        earningsBreakdown: [
          {
            refereeId: 3,
            refereeName: 'Jane Smith',
            totalEarned: 1000.0,
            pendingAmount: 200.0,
            paidAmount: 800.0,
            paymentsCount: 2,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getReferralEarnings(@GetUser() user: User) {
    return this.referralsService.getReferralEarnings(user.id);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get referral statistics (Admin only)',
    description: 'Get comprehensive referral system statistics',
  })
  @ApiOkResponse({
    description: 'Referral statistics retrieved successfully',
    schema: {
      example: {
        totalReferrals: 150,
        activeReferrers: 45,
        totalReferralEarnings: 75000.0,
        averageReferralsPerUser: 3.3,
        topReferrers: [
          {
            userId: 2,
            userName: 'John Doe',
            referralCount: 12,
            totalEarnings: 5000.0,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getReferralStats() {
    return this.referralsService.getReferralStats();
  }

  @Get('validate-code/:code')
  @ApiOperation({
    summary: 'Validate referral code',
    description:
      'Check if a referral code is valid and get referrer information',
  })
  @ApiParam({
    name: 'code',
    description: 'Referral code to validate',
    example: 'JOHN123',
  })
  @ApiOkResponse({
    description: 'Referral code validation result',
    schema: {
      example: {
        valid: true,
        referrer: {
          id: 2,
          firstName: 'John',
          lastName: 'Doe',
          profile: {
            fullName: 'John Doe',
            verified: true,
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Referral code not found',
    schema: {
      example: {
        valid: false,
        message: 'Referral code not found',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async validateReferralCode(@Param('code') code: string) {
    return this.referralsService.validateReferralCode(code);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get referral by ID (Admin only)',
    description: 'Get detailed information about a specific referral',
  })
  @ApiParam({
    name: 'id',
    description: 'Referral ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Referral retrieved successfully',
    schema: {
      example: {
        id: 1,
        referrerId: 2,
        refereeId: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        referrer: {
          id: 2,
          email: 'referrer@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profile: {
            fullName: 'John Doe',
            referralCode: 'JOHN123',
          },
        },
        referee: {
          id: 3,
          email: 'referee@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          profile: {
            fullName: 'Jane Smith',
            verified: true,
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Referral not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getReferralById(@Param('id', ParseIntPipe) id: number) {
    return this.referralsService.getReferralById(id);
  }
}
