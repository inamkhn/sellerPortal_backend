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
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  ProductsService,
  ProductWithOwner,
  PaginatedProducts,
} from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser, Roles } from '../auth/decorators';
import { User, Role } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private uploadService: UploadService,
  ) { }

  @Post()
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
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
  @ApiOperation({
    summary: 'Create a new product with photo upload',
    description:
      'Creates a new product listing with image upload to Cloudinary. Supports up to 10 images (5MB each).',
  })
  @ApiCreatedResponse({
    description: 'Product successfully created with uploaded photos',
    schema: {
      example: {
        id: 1,
        ownerId: 1,
        title: 'Comfortable Leather Sofa',
        description:
          'A beautiful and comfortable leather sofa perfect for your living room',
        price: 25000.5,
        category: 'SOFAS',
        condition: 'LIKE_NEW',
        photos: [
          'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/photo1.jpg',
          'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/photo2.jpg',
        ],
        brand: 'IKEA',
        colors: ['Brown', 'Black', 'White'],
        location: 'Karachi, Pakistan',
        material: 'Leather',
        productTags: ['furniture', 'living-room', 'comfortable'],
        quantity: 1,
        sku: 'SOFA-001',
        createdAt: '2024-01-01T00:00:00.000Z',
        owner: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Product with this SKU already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'Product with this SKU already exists',
        error: 'Conflict',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or file upload error',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Title must be between 3 and 200 characters',
          'Price must be positive',
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          'File size too large. Maximum size is 5MB.',
          'Maximum 10 images allowed per product.',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async create(
    @GetUser() user: User,
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<ProductWithOwner> {
    let photoUrls: string[] = [];

    // Handle image uploads if files are provided
    if (files && files.length > 0) {
      // Validate uploaded files
      this.uploadService.validateImageFiles(files);

      // Upload images to Cloudinary
      const uploadResults = await this.uploadService.uploadMultipleImages(
        files,
        'products',
      );
      photoUrls = uploadResults.map((result) => result.secure_url);
    }

    // Create product with uploaded photo URLs
    return this.productsService.create(user.id, createProductDto, photoUrls);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Retrieves a paginated list of all products with filtering and search capabilities',
  })
  @ApiOkResponse({
    description: 'Products retrieved successfully',
    schema: {
      example: {
        products: [
          {
            id: 1,
            ownerId: 1,
            title: 'Comfortable Leather Sofa',
            description: 'A beautiful and comfortable leather sofa',
            price: 25000.5,
            category: 'SOFAS',
            condition: 'LIKE_NEW',
            photos: ['https://example.com/photo1.jpg'],
            brand: 'IKEA',
            colors: ['Brown'],
            location: 'Karachi, Pakistan',
            material: 'Leather',
            productTags: ['furniture'],
            quantity: 1,
            sku: 'SOFA-001',
            createdAt: '2024-01-01T00:00:00.000Z',
            owner: {
              id: 1,
              email: 'user@example.com',
              firstName: 'John',
              lastName: 'Doe',
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
  async findAll(@Query() query: ProductQueryDto): Promise<PaginatedProducts> {
    return this.productsService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get all product categories',
    description:
      'Retrieves all available product categories with their display names',
  })
  @ApiOkResponse({
    description: 'Product categories retrieved successfully',
    schema: {
      example: [
        { value: 'BEDS', label: 'Beds' },
        { value: 'CHAIRS', label: 'Chairs' },
        { value: 'TABLES', label: 'Tables' },
        { value: 'SOFAS', label: 'Sofas' },
        { value: 'WARDROBES', label: 'Wardrobes' },
        { value: 'STORAGE', label: 'Storage' },
        { value: 'OTHER', label: 'Other' },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  getCategories(): { value: string; label: string }[] {
    return this.productsService.getCategories();
  }

  @Get('conditions')
  @ApiOperation({
    summary: 'Get all product conditions',
    description:
      'Retrieves all available product conditions with their display names',
  })
  @ApiOkResponse({
    description: 'Product conditions retrieved successfully',
    schema: {
      example: [
        { value: 'NEW', label: 'New' },
        { value: 'LIKE_NEW', label: 'Like New' },
        { value: 'GOOD', label: 'Good' },
        { value: 'FAIR', label: 'Fair' },
        { value: 'SECOND_HAND', label: 'Second Hand' },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  getConditions(): { value: string; label: string }[] {
    return this.productsService.getConditions();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get product statistics (Admin only)',
    description:
      'Retrieves comprehensive product statistics including counts by category and condition',
  })
  @ApiOkResponse({
    description: 'Product statistics retrieved successfully',
    schema: {
      example: {
        totalProducts: 150,
        productsByCategory: {
          SOFAS: 45,
          BEDS: 30,
          CHAIRS: 25,
          TABLES: 20,
          WARDROBES: 15,
          OTHER: 15,
        },
        productsByCondition: {
          NEW: 60,
          LIKE_NEW: 40,
          GOOD: 30,
          FAIR: 15,
          SECOND_HAND: 5,
        },
        averagePrice: 15750.25,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden',
        error: 'Forbidden',
      },
    },
  })
  async getStats(): Promise<{
    totalProducts: number;
    productsByCategory: Record<string, number>;
    productsByCondition: Record<string, number>;
    averagePrice: number;
  }> {
    return this.productsService.getProductStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieves a specific product by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Product retrieved successfully',
    schema: {
      example: {
        id: 1,
        ownerId: 1,
        title: 'Comfortable Leather Sofa',
        description: 'A beautiful and comfortable leather sofa',
        price: 25000.5,
        category: 'SOFAS',
        condition: 'LIKE_NEW',
        photos: ['https://example.com/photo1.jpg'],
        brand: 'IKEA',
        colors: ['Brown'],
        location: 'Karachi, Pakistan',
        material: 'Leather',
        productTags: ['furniture'],
        quantity: 1,
        sku: 'SOFA-001',
        createdAt: '2024-01-01T00:00:00.000Z',
        owner: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Product not found',
        error: 'Not Found',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductWithOwner> {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
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
  @ApiOperation({
    summary: 'Update product with optional photo upload',
    description:
      'Updates a product with optional new photo uploads. Only the product owner can update their products. New photos will be added to existing ones unless replacePhotos is true.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Product updated successfully with optional new photos',
    schema: {
      example: {
        id: 1,
        ownerId: 1,
        title: 'Updated Leather Sofa',
        description: 'Updated description',
        price: 27000.0,
        category: 'SOFAS',
        condition: 'LIKE_NEW',
        photos: [
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/existing-photo.jpg',
          'https://res.cloudinary.com/demo/image/upload/v1234567890/products/new-photo.jpg',
        ],
        brand: 'IKEA',
        colors: ['Brown', 'Black'],
        location: 'Karachi, Pakistan',
        material: 'Leather',
        productTags: ['furniture', 'updated'],
        quantity: 1,
        sku: 'SOFA-001-UPDATED',
        createdAt: '2024-01-01T00:00:00.000Z',
        owner: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiForbiddenResponse({
    description: 'You can only update your own products',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only update your own products',
        error: 'Forbidden',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Product with this SKU already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or file upload error',
    schema: {
      examples: {
        validation: {
          summary: 'Validation Error',
          value: {
            statusCode: 400,
            message: [
              'Title must be between 3 and 200 characters',
              'Price must be positive',
            ],
            error: 'Bad Request',
          },
        },
        fileUpload: {
          summary: 'File Upload Error',
          value: {
            statusCode: 400,
            message:
              'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
            error: 'Bad Request',
          },
        },
        fileSize: {
          summary: 'File Size Error',
          value: {
            statusCode: 400,
            message: 'File size too large. Maximum size is 5MB.',
            error: 'Bad Request',
          },
        },
        tooManyFiles: {
          summary: 'Too Many Files',
          value: {
            statusCode: 400,
            message: 'Maximum 10 images allowed per product.',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<ProductWithOwner> {
    let newPhotoUrls: string[] = [];

    // Handle image uploads if files are provided
    if (files && files.length > 0) {
      // Validate uploaded files
      this.uploadService.validateImageFiles(files);

      // Upload images to Cloudinary
      const uploadResults = await this.uploadService.uploadMultipleImages(
        files,
        'products',
      );
      newPhotoUrls = uploadResults.map((result) => result.secure_url);
    }

    // Update product with new photo URLs
    return this.productsService.update(
      id,
      user.id,
      updateProductDto,
      newPhotoUrls,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete product and associated images',
    description:
      'Deletes a product and all its associated images from Cloudinary. Only the product owner or admin can delete products.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    example: 1,
    type: 'integer',
  })
  @ApiNoContentResponse({
    description: 'Product deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiForbiddenResponse({
    description: 'You can only delete your own products or be an admin',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only delete your own products or be an admin',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<void> {
    return this.productsService.remove(id, user.id, user.role);
  }
}
