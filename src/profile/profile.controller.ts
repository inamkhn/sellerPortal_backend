import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  ProfileService,
  ProductWithOwner,
  MinimalProduct,
} from './profile.service';
import { CreateProfileDto, UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser, Roles } from '../auth/decorators';
import { User, Profile, Role } from '@prisma/client';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Post()
  @ApiOperation({
    summary: 'Create user profile',
    description: 'Creates a new profile for the authenticated user',
  })
  @ApiCreatedResponse({
    description: 'Profile successfully created',
    schema: {
      example: {
        id: 1,
        userId: 1,
        fullName: 'John Doe',
        address: '123 Main Street, Karachi, Pakistan',
        whatsappNumber: '+923001234567',
        bankAccount: 'EASYPAISA',
        accountNumber: '03001234567',
        facebookLink: 'https://facebook.com/johndoe',
        dubizzleLink: 'https://dubizzle.com/users/johndoe',
        verified: false,
        referralCode: 'ABC12345',
        referredBy: null,
        listedProducts: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User already has a profile or referral code is taken',
    schema: {
      example: {
        statusCode: 409,
        message: 'User already has a profile',
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
          'Full name must be between 2 and 100 characters',
          'Referral code must be exactly 8 characters',
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
  async createProfile(
    @GetUser() user: User,
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<Profile> {
    return this.profileService.createProfile(user.id, createProfileDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieves the profile of the authenticated user',
  })
  @ApiOkResponse({
    description: 'Profile retrieved successfully',
    schema: {
      example: {
        id: 1,
        userId: 1,
        fullName: 'John Doe',
        address: '123 Main Street, Karachi, Pakistan',
        whatsappNumber: '+923001234567',
        bankAccount: 'EASYPAISA',
        accountNumber: '03001234567',
        facebookLink: 'https://facebook.com/johndoe',
        dubizzleLink: 'https://dubizzle.com/users/johndoe',
        verified: false,
        referralCode: 'ABC12345',
        referredBy: null,
        listedProducts: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          isVerified: true,
        },
        referrer: null,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Profile not found',
        error: 'Not Found',
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
  async getProfile(@GetUser() user: User): Promise<Profile> {
    return this.profileService.getProfile(user.id);
  }

  @Put()
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates the profile of the authenticated user',
  })
  @ApiOkResponse({
    description: 'Profile updated successfully',
    schema: {
      example: {
        id: 1,
        userId: 1,
        fullName: 'John Doe Updated',
        address: '456 Updated Street, Karachi, Pakistan',
        whatsappNumber: '+923009876543',
        bankAccount: 'JAZZCASH',
        accountNumber: '03009876543',
        facebookLink: 'https://facebook.com/johndoe.updated',
        dubizzleLink: 'https://dubizzle.com/users/johndoe.updated',
        verified: true,
        referralCode: 'XYZ98765',
        referredBy: 2,
        listedProducts: ['product-1', 'product-2', 'product-3'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        },
        referrer: {
          id: 2,
          email: 'referrer@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Profile not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Referral code is already taken',
    schema: {
      example: {
        statusCode: 409,
        message: 'Referral code is already taken',
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
          'WhatsApp number must be in international format',
          'Please provide a valid Facebook profile URL',
          'Referrer user not found',
          'Cannot refer yourself',
          'Each listed product must be a string',
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
  async updateProfile(
    @GetUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<Profile> {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Delete user profile (Admin only)',
    description:
      'Deletes the profile of the authenticated user. Only admin users can delete profiles.',
  })
  @ApiNoContentResponse({
    description: 'Profile deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Profile not found',
        error: 'Not Found',
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
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - Admin role required',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden',
        error: 'Forbidden',
      },
    },
  })
  async deleteProfile(@GetUser() user: User): Promise<void> {
    return this.profileService.deleteProfile(user.id);
  }

  // Product Management Endpoints
  @Post('products/:productId')
  @ApiOperation({
    summary: 'Add product to profile listed products',
    description:
      "Adds a product to the user's profile listedProducts array. Only the product owner can add their own products.",
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID to add to profile',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Product successfully added to profile',
    schema: {
      example: {
        id: 1,
        userId: 1,
        fullName: 'John Doe',
        address: '123 Main Street, Karachi, Pakistan',
        whatsappNumber: '+923001234567',
        bankAccount: 'EASYPAISA',
        accountNumber: '03001234567',
        facebookLink: 'https://facebook.com/johndoe',
        dubizzleLink: 'https://dubizzle.com/users/johndoe',
        verified: false,
        referralCode: 'ABC12345',
        referredBy: null,
        listedProducts: ['1', '2', '3'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        },
        referrer: null,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Profile or product not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Product not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'You can only add your own products to your profile',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only add your own products to your profile',
        error: 'Forbidden',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Product is already in your listed products',
    schema: {
      example: {
        statusCode: 409,
        message: 'Product is already in your listed products',
        error: 'Conflict',
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
  async addProductToProfile(
    @GetUser() user: User,
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<Profile> {
    return this.profileService.addProductToProfile(user.id, productId);
  }

  @Delete('products/:productId')
  @ApiOperation({
    summary: 'Remove product from profile listed products',
    description:
      "Removes a product from the user's profile listedProducts array.",
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID to remove from profile',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Product successfully removed from profile',
    schema: {
      example: {
        id: 1,
        userId: 1,
        fullName: 'John Doe',
        address: '123 Main Street, Karachi, Pakistan',
        whatsappNumber: '+923001234567',
        bankAccount: 'EASYPAISA',
        accountNumber: '03001234567',
        facebookLink: 'https://facebook.com/johndoe',
        dubizzleLink: 'https://dubizzle.com/users/johndoe',
        verified: false,
        referralCode: 'ABC12345',
        referredBy: null,
        listedProducts: ['2', '3'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
        },
        referrer: null,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Profile not found or product is not in your listed products',
    schema: {
      example: {
        statusCode: 404,
        message: 'Product is not in your listed products',
        error: 'Not Found',
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
  async removeProductFromProfile(
    @GetUser() user: User,
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<Profile> {
    return this.profileService.removeProductFromProfile(user.id, productId);
  }

  @Get('products')
  @ApiOperation({
    summary: "Get user's listed products",
    description:
      "Retrieves all products in the user's profile listedProducts array with full product details.",
  })
  @ApiOkResponse({
    description: 'Listed products retrieved successfully',
    schema: {
      example: [
        {
          id: 41,
          ownerId: 13,
          title: 'Comfortable Leather Sofa',
          price: '25000.5',
          category: 'SOFAS',
          condition: 'LIKE_NEW',
          sku: 'SOFA-001',
          facebookPostingStatus: 'NOT_POSTED',
          createdAt: '2025-10-03T18:14:02.524Z',
        },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: 'Profile not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Profile not found',
        error: 'Not Found',
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
  async getListedProducts(@GetUser() user: User): Promise<MinimalProduct[]> {
    return this.profileService.getListedProducts(user.id);
  }

  @Get(':userId/products')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Get any user's listed products (Admin only)",
    description:
      "Retrieves all products in a specific user's profile listedProducts array. Only accessible by admin users.",
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID whose listed products to retrieve',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: "User's listed products retrieved successfully",
    schema: {
      example: [
        {
          id: 1,
          ownerId: 1,
          title: 'Comfortable Leather Sofa',
          description:
            'A beautiful and comfortable leather sofa perfect for your living room',
          price: 25000.5,
          category: 'SOFAS',
          condition: 'LIKE_NEW',
          photos: [
            'https://res.cloudinary.com/demo/image/upload/v1234567890/products/photo1.jpg',
          ],
          brand: 'IKEA',
          colors: ['Brown', 'Black'],
          location: 'Karachi, Pakistan',
          material: 'Leather',
          productTags: ['furniture', 'living-room'],
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
    },
  })
  @ApiNotFoundResponse({
    description: 'User or profile not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      },
    },
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
  async getListedProductsByAdmin(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ProductWithOwner[]> {
    return this.profileService.getListedProductsByAdmin(userId);
  }
}
