import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { SettlementService } from './settlement.service';
import {
  SettlementQueryDto,
  CreateSettlementDto,
  UpdateSettlementDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators';
import { User, SettlementStatus } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

@ApiTags('Settlements')
@Controller('settlements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettlementController {
  constructor(
    private readonly settlementService: SettlementService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('pending-total')
  @ApiOperation({
    summary: 'Get pending settlement total and payout window status',
    description:
      'Returns total pending settlements, payout window status, next payout date, and rate limit status',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending settlement data retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPendingTotal(@GetUser() user: User) {
    const [totalPending, hasRequestedToday, canRequestPayout, nextPayoutDate] =
      await Promise.all([
        this.settlementService.getPendingSettlementTotal(user.id),
        this.settlementService.hasRequestedPayoutToday(user.id),
        this.settlementService.isPayoutWindowActive(),
        this.settlementService.getNextPayoutDate(),
      ]);

    return {
      success: true,
      data: {
        totalPending,
        canRequestPayout,
        nextPayoutDate,
        hasRequestedToday,
      },
    };
  }

  @Post('request-payout')
  @ApiOperation({
    summary: 'Request payout for pending settlements',
    description:
      'Submit a payout request for all pending settlements. Only available during payout windows (15-16 and 30-31-1). Limited to one request per day.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payout request submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - outside payout window, already requested today, no pending settlements, or missing bank account',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestPayout(@GetUser() user: User) {
    const userName =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    const data = await this.settlementService.requestPayout(user.id, userName);

    return {
      success: true,
      message: 'Payout request submitted successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all settlements',
    description:
      'Admin sees all settlements. Users see their own + their referrals settlements.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlements retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@GetUser() user: User, @Query() query: SettlementQueryDto) {
    return this.settlementService.findAll(user.id, user.role, query);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('paymentProof', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/jpg',
          'application/pdf',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Invalid file type. Only JPEG, PNG, WebP images and PDF files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({
    summary: 'Create a new settlement (Admin and Referral Manager)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Settlement created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Referral Manager only',
  })
  async create(
    @GetUser() user: User,
    @Body() createDto: CreateSettlementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'REFERRAL_MANAGER') {
      throw new ForbiddenException(
        'Only admins and referral managers can create settlements',
      );
    }

    let paymentProofUrl: string | undefined;

    // Handle payment proof upload if file is provided
    if (file) {
      const uploadResult = await this.uploadService.uploadImage(
        file,
        'settlements/payment-proofs',
      );
      paymentProofUrl = uploadResult.secure_url;
    }

    return this.settlementService.create(
      createDto.orderSettlementId,
      createDto.userId,
      createDto.settlementType,
      createDto.amount,
      user.id,
      user.role,
      createDto.notes,
      paymentProofUrl,
    );
  }

  //   @Get(':id')
  //   @ApiOperation({ summary: 'Get a specific settlement by ID' })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'Settlement retrieved successfully',
  //   })
  //   @ApiResponse({ status: 404, description: 'Settlement not found' })
  //   @ApiResponse({ status: 401, description: 'Unauthorized' })
  //   @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  //   async findOne(@GetUser() user: User, @Param('id') id: string) {
  //     const settlement = await this.settlementService.findOne(
  //       +id,
  //       user.id,
  //       user.role,
  //     );

  //     if (!settlement) {
  //       throw new NotFoundException('Settlement not found');
  //     }

  //     return settlement;
  //   }

  @Get('admin/grouped-by-manager')
  @ApiOperation({
    summary: 'Get settlements grouped by referral manager (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlements grouped by manager retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getSettlementsGroupedByManager(
    @GetUser() user: User,
    @Query() query: SettlementQueryDto,
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can view grouped settlements');
    }
    return this.settlementService.getSettlementsGroupedByManager(query);
  }

  @Get('referral-manager/history')
  @ApiOperation({
    summary: 'Get commission history (Referral Manager only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Commission history retrieved',
    schema: {
      example: {
        data: [
          {
            id: 1,
            orderId: 'ORD-001',
            sellerName: 'Ahmed Khan',
            orderAmount: 5000,
            commissionRate: 10,
            commissionAmount: 450,
            status: 'PAID',
            setDate: '2024-10-15T10:30:00Z',
            paymentDate: '2024-10-20T14:20:00Z',
            createdAt: '2024-10-15T10:30:00Z',
          },
        ],
        stats: {
          totalCommission: 2920.5,
          averageCommissionRate: 13.75,
          topEarningPeriod: 'October 2024',
          topEarningAmount: 2920.5,
        },
      },
    },
  })
  async getCommissionHistory(
    @GetUser() user: User,
    @Query() query: SettlementQueryDto,
  ) {
    if (user.role !== 'REFERRAL_MANAGER') {
      throw new ForbiddenException(
        'Only referral managers can view commission history',
      );
    }
    return this.settlementService.getCommissionHistory(user.id, query);
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('paymentProof', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/jpg',
          'application/pdf',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Invalid file type. Only JPEG, PNG, WebP images and PDF files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Update a settlement (Admin and Referral Manager)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Settlement updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  async update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateSettlementDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { amount, status, paidAt, paymentProof, notes } = updateDto;

    const updateData: {
      amount?: number;
      status?: SettlementStatus;
      paidAt?: Date;
      paymentProof?: string;
      notes?: string;
    } = {};

    if (amount !== undefined) {
      updateData.amount = amount;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (paidAt !== undefined) {
      updateData.paidAt = new Date(paidAt);
    }

    // Handle payment proof upload if file is provided
    if (file) {
      const uploadResult = await this.uploadService.uploadImage(
        file,
        'settlements/payment-proofs',
      );
      updateData.paymentProof = uploadResult.secure_url;
    } else if (paymentProof !== undefined) {
      // If no file but paymentProof string is provided (URL)
      updateData.paymentProof = paymentProof;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    return this.settlementService.update(+id, user.id, user.role, updateData);
  }
}
