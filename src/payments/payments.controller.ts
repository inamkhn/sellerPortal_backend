import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiConflictResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  PaymentsService,
  PaymentWithDetails,
  PaginatedPayments,
} from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentQueryDto,
  UploadProofDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser, Roles } from '../auth/decorators';
import { User, Role } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private uploadService: UploadService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new payment',
    description:
      'Creates a new payment for an order request. Can include seller and referrer payments.',
  })
  @ApiCreatedResponse({
    description: 'Payment successfully created',
    schema: {
      example: {
        id: 1,
        orderRequestId: 1,
        userId: 2,
        userShare: 22500.0,
        referrerId: 3,
        referrerShare: 2500.0,
        totalPrice: 25000.0,
        proofScreenshotUrl: null,
        status: 'PENDING',
        paymentType: 'SELLER',
        createdAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 2,
          email: 'seller@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        referrer: {
          id: 3,
          email: 'referrer@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
        },
        orderRequest: {
          id: 1,
          customerName: 'John Doe',
          customerEmail: 'customer@example.com',
          decidedPrice: 25000.0,
          status: 'CONFIRMED',
          product: {
            id: 1,
            title: 'Comfortable Leather Sofa',
            price: 25000.0,
            owner: {
              id: 2,
              email: 'seller@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order request not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order request not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'You can only create payments for your own orders or products',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only create payments for your own orders or products',
        error: 'Forbidden',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Payment already exists for this order request',
    schema: {
      example: {
        statusCode: 409,
        message: 'Payment already exists for this order request',
        error: 'Conflict',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Total price must be greater than 0',
          'User share must be greater than 0',
          'Referrer share must be provided when referrer is specified',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async create(
    @GetUser() user: User,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentWithDetails> {
    return this.paymentsService.create(user.id, createPaymentDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all payments (Admin only)',
    description:
      'Retrieves a paginated list of all payments with filtering capabilities. Only accessible by admin users.',
  })
  @ApiOkResponse({
    description: 'Payments retrieved successfully',
    schema: {
      example: {
        payments: [
          {
            id: 1,
            orderRequestId: 1,
            userId: 2,
            userShare: 22500.0,
            referrerId: 3,
            referrerShare: 2500.0,
            totalPrice: 25000.0,
            proofScreenshotUrl: 'https://example.com/proof.jpg',
            status: 'PAID',
            paymentType: 'SELLER',
            createdAt: '2024-01-01T00:00:00.000Z',
            user: {
              id: 2,
              email: 'seller@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
            },
            referrer: {
              id: 3,
              email: 'referrer@example.com',
              firstName: 'Bob',
              lastName: 'Johnson',
            },
            orderRequest: {
              id: 1,
              customerName: 'John Doe',
              customerEmail: 'customer@example.com',
              decidedPrice: 25000.0,
              status: 'DELIVERED',
              product: {
                id: 1,
                title: 'Comfortable Leather Sofa',
                price: 25000.0,
                owner: {
                  id: 2,
                  email: 'seller@example.com',
                  firstName: 'Jane',
                  lastName: 'Smith',
                },
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
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async findAll(@Query() query: PaymentQueryDto): Promise<PaginatedPayments> {
    return this.paymentsService.findAll(query);
  }

  @Get('my-payments')
  @ApiOperation({
    summary: "Get current user's payments",
    description:
      'Retrieves a paginated list of payments for the authenticated user (as recipient)',
  })
  @ApiOkResponse({
    description: 'User payments retrieved successfully',
    schema: {
      example: {
        payments: [
          {
            id: 1,
            orderRequestId: 1,
            userId: 2,
            userShare: 22500.0,
            referrerId: null,
            referrerShare: null,
            totalPrice: 25000.0,
            proofScreenshotUrl: 'https://example.com/proof.jpg',
            status: 'PAID',
            paymentType: 'SELLER',
            createdAt: '2024-01-01T00:00:00.000Z',
            user: {
              id: 2,
              email: 'seller@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
            },
            referrer: null,
            orderRequest: {
              id: 1,
              customerName: 'John Doe',
              customerEmail: 'customer@example.com',
              decidedPrice: 25000.0,
              status: 'DELIVERED',
              product: {
                id: 1,
                title: 'Comfortable Leather Sofa',
                price: 25000.0,
                owner: {
                  id: 2,
                  email: 'seller@example.com',
                  firstName: 'Jane',
                  lastName: 'Smith',
                },
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
  async findUserPayments(
    @GetUser() user: User,
    @Query() query: PaymentQueryDto,
  ): Promise<PaginatedPayments> {
    return this.paymentsService.findUserPayments(user.id, query);
  }

  @Get('my-referral-payments')
  @ApiOperation({
    summary: "Get current user's referral payments",
    description:
      'Retrieves a paginated list of referral payments for the authenticated user',
  })
  @ApiOkResponse({
    description: 'Referral payments retrieved successfully',
    schema: {
      example: {
        payments: [
          {
            id: 2,
            orderRequestId: 1,
            userId: 2,
            userShare: 22500.0,
            referrerId: 3,
            referrerShare: 2500.0,
            totalPrice: 25000.0,
            proofScreenshotUrl: 'https://example.com/proof.jpg',
            status: 'PAID',
            paymentType: 'REFERRAL',
            createdAt: '2024-01-01T00:00:00.000Z',
            user: {
              id: 2,
              email: 'seller@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
            },
            referrer: {
              id: 3,
              email: 'referrer@example.com',
              firstName: 'Bob',
              lastName: 'Johnson',
            },
            orderRequest: {
              id: 1,
              customerName: 'John Doe',
              customerEmail: 'customer@example.com',
              decidedPrice: 25000.0,
              status: 'DELIVERED',
              product: {
                id: 1,
                title: 'Comfortable Leather Sofa',
                price: 25000.0,
                owner: {
                  id: 2,
                  email: 'seller@example.com',
                  firstName: 'Jane',
                  lastName: 'Smith',
                },
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
  async findReferralPayments(
    @GetUser() user: User,
    @Query() query: PaymentQueryDto,
  ): Promise<PaginatedPayments> {
    return this.paymentsService.findReferrerPayments(user.id, query);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get payment statistics (Admin only)',
    description:
      'Retrieves comprehensive payment statistics including totals by status and type',
  })
  @ApiOkResponse({
    description: 'Payment statistics retrieved successfully',
    schema: {
      example: {
        totalPayments: 150,
        paymentsByStatus: {
          PENDING: 45,
          PAID: 95,
          CANCELLED: 10,
        },
        paymentsByType: {
          SELLER: 120,
          REFERRAL: 30,
        },
        totalAmount: 3750000.0,
        totalSellerAmount: 3375000.0,
        totalReferrerAmount: 375000.0,
        recentPayments: 12,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  async getStats(): Promise<{
    totalPayments: number;
    paymentsByStatus: Record<string, number>;
    paymentsByType: Record<string, number>;
    totalAmount: number;
    totalSellerAmount: number;
    totalReferrerAmount: number;
    recentPayments: number;
  }> {
    return this.paymentsService.getPaymentStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment by ID',
    description:
      'Retrieves a specific payment by its ID. Users can only access payments related to their orders or products.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Payment retrieved successfully',
    schema: {
      example: {
        id: 1,
        orderRequestId: 1,
        userId: 2,
        userShare: 22500.0,
        referrerId: 3,
        referrerShare: 2500.0,
        totalPrice: 25000.0,
        proofScreenshotUrl: 'https://example.com/proof.jpg',
        status: 'PAID',
        paymentType: 'SELLER',
        createdAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 2,
          email: 'seller@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        referrer: {
          id: 3,
          email: 'referrer@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
        },
        orderRequest: {
          id: 1,
          customerName: 'John Doe',
          customerEmail: 'customer@example.com',
          decidedPrice: 25000.0,
          status: 'DELIVERED',
          product: {
            id: 1,
            title: 'Comfortable Leather Sofa',
            price: 25000.0,
            owner: {
              id: 2,
              email: 'seller@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PaymentWithDetails> {
    return this.paymentsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update payment',
    description:
      'Updates a payment. Users can update payments related to their orders or products, admins can update any payment.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Payment updated successfully',
    schema: {
      example: {
        id: 1,
        orderRequestId: 1,
        userId: 2,
        userShare: 22500.0,
        referrerId: 3,
        referrerShare: 2500.0,
        totalPrice: 25000.0,
        proofScreenshotUrl: 'https://example.com/updated-proof.jpg',
        status: 'PAID',
        paymentType: 'SELLER',
        createdAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 2,
          email: 'seller@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        referrer: {
          id: 3,
          email: 'referrer@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
        },
        orderRequest: {
          id: 1,
          customerName: 'John Doe',
          customerEmail: 'customer@example.com',
          decidedPrice: 25000.0,
          status: 'DELIVERED',
          product: {
            id: 1,
            title: 'Comfortable Leather Sofa',
            price: 25000.0,
            owner: {
              id: 2,
              email: 'seller@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  @ApiForbiddenResponse({
    description:
      'You can only update payments related to your orders or products',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentWithDetails> {
    return this.paymentsService.update(
      id,
      user.id,
      user.role,
      updatePaymentDto,
    );
  }

  @Post(':id/upload-proof')
  @UseInterceptors(
    FileInterceptor('proof', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/jpg',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload payment proof',
    description:
      'Uploads a payment proof screenshot. Only payment recipients or order creators can upload proof.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Payment proof uploaded successfully',
    schema: {
      example: {
        id: 1,
        orderRequestId: 1,
        userId: 2,
        userShare: 22500.0,
        referrerId: 3,
        referrerShare: 2500.0,
        totalPrice: 25000.0,
        proofScreenshotUrl:
          'https://res.cloudinary.com/demo/image/upload/v1234567890/payments/proof.jpg',
        status: 'PENDING',
        paymentType: 'SELLER',
        createdAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 2,
          email: 'seller@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        referrer: {
          id: 3,
          email: 'referrer@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
        },
        orderRequest: {
          id: 1,
          customerName: 'John Doe',
          customerEmail: 'customer@example.com',
          decidedPrice: 25000.0,
          status: 'DELIVERED',
          product: {
            id: 1,
            title: 'Comfortable Leather Sofa',
            price: 25000.0,
            owner: {
              id: 2,
              email: 'seller@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  @ApiForbiddenResponse({
    description: 'You can only upload proof for your own payments',
  })
  @ApiBadRequestResponse({
    description: 'Invalid file type or file too large',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async uploadProof(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PaymentWithDetails> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate uploaded file
    this.uploadService.validateImageFiles([file]);

    // Upload image to Cloudinary
    const uploadResult = await this.uploadService.uploadMultipleImages(
      [file],
      'payments',
    );
    const proofScreenshotUrl = uploadResult[0].secure_url;

    const uploadProofDto: UploadProofDto = {
      proofScreenshotUrl,
    };

    return this.paymentsService.uploadProof(id, user.id, uploadProofDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete payment',
    description:
      'Deletes a payment. Only admins or payment recipients can delete payments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 1,
    type: 'integer',
  })
  @ApiNoContentResponse({
    description: 'Payment deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Payment not found',
  })
  @ApiForbiddenResponse({
    description: 'You can only delete your own payments or be an admin',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<void> {
    return this.paymentsService.remove(id, user.id, user.role);
  }
}
