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
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { OrderRequestService } from './order-request.service';
import {
  CreateOrderRequestDto,
  UpdateOrderRequestDto,
  OrderRequestResponseDto,
  OrderType,
} from './dto';
import { OrderRequestQueryDto } from './dto/order-request-query.dto';
import { PaginatedOrderRequestsDto } from './dto/paginated-order-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

@ApiTags('Order Requests')
@Controller('order-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderRequestController {
  constructor(
    private readonly orderRequestService: OrderRequestService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('customProductImages', 50, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/jpg',
          'image/gif',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiOperation({
    summary: 'Create a new order request',
    description:
      'Create an order request for existing or custom products. For custom products with multiple items, upload all images and specify imageIndices in each customProduct object to map images to products.',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({
    status: 201,
    description: 'Order request created successfully',
    type: OrderRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async create(
    @GetUser() user: User,
    @Body() createOrderRequestDto: CreateOrderRequestDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let imageUrls: string[] = [];

    // Handle image uploads for custom products
    if (
      createOrderRequestDto.orderType === OrderType.CUSTOM_PRODUCT &&
      files &&
      files.length > 0
    ) {
      // Validate uploaded files
      this.uploadService.validateImageFiles(files);

      // Upload all images to Cloudinary
      const uploadResults = await this.uploadService.uploadMultipleImages(
        files,
        'order-requests',
      );
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    return this.orderRequestService.create(
      user.id,
      createOrderRequestDto,
      imageUrls,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all order requests with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Order requests retrieved successfully',
    type: PaginatedOrderRequestsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@GetUser() user: User, @Query() query: OrderRequestQueryDto) {
    return this.orderRequestService.findAll(user.id, user.role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Order request retrieved successfully',
    type: OrderRequestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.orderRequestService.findOne(+id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order request' })
  @ApiResponse({
    status: 200,
    description: 'Order request updated successfully',
    type: OrderRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Order request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateOrderRequestDto: UpdateOrderRequestDto,
  ) {
    return this.orderRequestService.update(
      +id,
      user.id,
      user.role,
      updateOrderRequestDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an order request' })
  @ApiResponse({
    status: 204,
    description: 'Order request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Order request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  remove(@GetUser() user: User, @Param('id') id: string) {
    return this.orderRequestService.remove(+id, user.id, user.role);
  }
}
