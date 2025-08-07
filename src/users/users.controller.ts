import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser, Roles } from '../auth/decorators';
import { User, Role } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description:
      'Retrieves a paginated list of all users with filtering capabilities',
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
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by email, firstName, or lastName',
    example: 'john@example.com',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by user role',
    enum: Role,
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    description: 'Filter by verification status',
    type: 'boolean',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @ApiOkResponse({
    description: 'Users retrieved successfully',
    schema: {
      example: {
        users: [
          {
            id: 1,
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            avatar: 'https://example.com/avatar.jpg',
            role: 'USER',
            isVerified: true,
            googleId: null,
            lastLogin: '2024-01-01T00:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            profile: {
              id: 1,
              fullName: 'John Doe',
              address: '123 Main St',
              whatsappNumber: '+1234567890',
              verified: true,
              referralCode: 'JOHN123',
            },
            _count: {
              products: 5,
              orderRequests: 3,
              payments: 2,
            },
          },
        ],
        total: 100,
        page: 1,
        limit: 10,
        totalPages: 10,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('isVerified') isVerified?: boolean,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.usersService.getAllUsers({
      page,
      limit,
      search,
      role,
      isVerified,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get user statistics (Admin only)',
    description:
      'Get comprehensive user statistics including totals and activity metrics',
  })
  @ApiOkResponse({
    description: 'User statistics retrieved successfully',
    schema: {
      example: {
        totalUsers: 1500,
        activeUsers: 450,
        newUsersLast30Days: 125,
        verifiedUsers: 1200,
        unverifiedUsers: 300,
        usersByRole: {
          USER: 1450,
          ADMIN: 50,
        },
        usersWithOrders: 800,
        usersWithProducts: 600,
        googleAuthUsers: 400,
        recentActivity: {
          last7Days: 85,
          last30Days: 125,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID (Admin only)',
    description: 'Retrieve detailed information about a specific user',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'User retrieved successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatar.jpg',
        role: 'USER',
        isVerified: true,
        googleId: null,
        lastLogin: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        profile: {
          id: 1,
          fullName: 'John Doe',
          address: '123 Main St',
          whatsappNumber: '+1234567890',
          bankAccount: 'EASYPAISA',
          accountNumber: '1234567890',
          facebookLink: 'https://facebook.com/johndoe',
          dubizzleLink: 'https://dubizzle.com/johndoe',
          verified: true,
          referralCode: 'JOHN123',
          referredBy: null,
        },
        products: [],
        orderRequests: [],
        payments: [],
        referralsMade: [],
        referralsReceived: [],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user (Admin only)',
    description:
      'Update user information including role and verification status',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'User updated successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatar.jpg',
        role: 'USER',
        isVerified: true,
        googleId: null,
        lastLogin: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateData: {
      firstName?: string;
      lastName?: string;
      role?: Role;
      isVerified?: boolean;
      avatar?: string;
    },
  ) {
    return this.usersService.updateUser(id, updateData);
  }

  @Put(':id/suspend')
  @ApiOperation({
    summary: 'Suspend user (Admin only)',
    description: 'Suspend a user by setting isVerified to false',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'User suspended successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isVerified: false,
        message: 'User has been suspended',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async suspendUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.suspendUser(id);
  }

  @Put(':id/activate')
  @ApiOperation({
    summary: 'Activate user (Admin only)',
    description: 'Activate a suspended user by setting isVerified to true',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'User activated successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isVerified: true,
        message: 'User has been activated',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async activateUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.activateUser(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user (Admin only)',
    description: 'Permanently delete a user and all associated data',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 1,
  })
  @ApiNoContentResponse({
    description: 'User deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions - Admin role required',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: User,
  ) {
    return this.usersService.deleteUser(id, currentUser.id);
  }
}
