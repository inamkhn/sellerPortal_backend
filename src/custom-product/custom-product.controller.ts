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
import { CustomProductService } from './custom-product.service';
import {
  CreateCustomProductDto,
  UpdateCustomProductDto,
  CustomProductResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

@ApiTags('Custom Products')
@Controller('custom-products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomProductController {
  constructor(
    private readonly customProductService: CustomProductService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('/:orderRequestId')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
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
  @ApiOperation({ summary: 'Create a custom product for an order request' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({
    status: 201,
    description: 'Custom product created successfully',
    type: CustomProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Order request not found' })
  async create(
    @GetUser() user: User,
    @Param('orderRequestId') orderRequestId: string,
    @Body() createCustomProductDto: CreateCustomProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let imageUrls: string[] = [];

    // Handle image uploads
    if (files && files.length > 0) {
      // Validate uploaded files
      this.uploadService.validateImageFiles(files);

      // Upload images to Cloudinary
      const uploadResults = await this.uploadService.uploadMultipleImages(
        files,
        'custom-products',
      );
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    return this.customProductService.create(
      +orderRequestId,
      user.id,
      user.role,
      createCustomProductDto,
      imageUrls,
    );
  }

  @Get('/:orderRequestId')
  @ApiOperation({ summary: 'Get custom product by order request ID' })
  @ApiResponse({
    status: 200,
    description: 'Custom product retrieved successfully',
    type: CustomProductResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Custom product not found' })
  findByOrderRequestId(
    @GetUser() user: User,
    @Param('orderRequestId') orderRequestId: string,
  ) {
    return this.customProductService.findByOrderRequestId(
      +orderRequestId,
      user.id,
      user.role,
    );
  }

  @Patch('/:orderRequestId')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
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
    summary: 'Update custom product by order request ID',
    description:
      'Update custom product. Use replaceImages=true to replace all images with new uploads (deletes old images from Cloudinary). Default is false (appends new images).',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({
    status: 200,
    description: 'Custom product updated successfully',
    type: CustomProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Custom product not found' })
  async update(
    @GetUser() user: User,
    @Param('orderRequestId') orderRequestId: string,
    @Query('replaceImages') replaceImages: string,
    @Body() updateCustomProductDto: UpdateCustomProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let newImageUrls: string[] = [];

    // Handle new image uploads
    if (files && files.length > 0) {
      // Validate uploaded files
      this.uploadService.validateImageFiles(files);

      // Upload images to Cloudinary
      const uploadResults = await this.uploadService.uploadMultipleImages(
        files,
        'custom-products',
      );
      newImageUrls = uploadResults.map((result) => result.secure_url);
    }

    const shouldReplaceImages = replaceImages === 'true';

    return this.customProductService.update(
      +orderRequestId,
      user.id,
      user.role,
      updateCustomProductDto,
      newImageUrls,
      shouldReplaceImages,
    );
  }

  @Delete('/:orderRequestId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete custom product by order request ID' })
  @ApiResponse({
    status: 204,
    description: 'Custom product deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Custom product not found' })
  remove(
    @GetUser() user: User,
    @Param('orderRequestId') orderRequestId: string,
  ) {
    return this.customProductService.remove(
      +orderRequestId,
      user.id,
      user.role,
    );
  }
}
