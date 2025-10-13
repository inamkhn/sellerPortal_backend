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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  OrdersService,
  OrderWithDetails,
  PaginatedOrders,
} from './orders.service';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser, Roles } from '../auth/decorators';
import { User, Role } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new order request',
    description:
      'Creates a new order request for a product with customer details and delivery information',
  })
  @ApiCreatedResponse({
    description: 'Order request successfully created',
    schema: {
      example: {
        id: 1,
        userId: 1,
        productId: 1,
        platform: 'Website',
        decidedPrice: 25000.5,
        advancePayment: false,
        customerName: 'John Doe',
        customerPhone: '+923001234567',
        customerWhatsapp: '+923001234567',
        customerEmail: 'customer@example.com',
        customerNotes: 'Please deliver between 2-4 PM',
        productName: 'Custom Leather Sofa',
        productDescription: 'Modified with custom cushions',
        customize_images: ['https://example.com/custom1.jpg'],
        deliveringDate: '2024-02-15T10:00:00.000Z',
        deliveryAddress: '123 Main Street, Karachi, Pakistan',
        deliveryDate: '2024-02-20T14:00:00.000Z',
        status: 'PENDING',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        product: {
          id: 1,
          title: 'Comfortable Leather Sofa',
          description: 'A beautiful leather sofa',
          price: 25000.5,
          category: 'SOFAS',
          condition: 'LIKE_NEW',
          photos: ['https://example.com/photo1.jpg'],
          owner: {
            id: 2,
            email: 'seller@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
        payments: [],
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
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Product ID must be a number',
          'Decided price must be greater than 0',
          'Customer name is required',
          'Customer email must be a valid email',
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
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderWithDetails> {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all orders (Admin only)',
    description:
      'Retrieves a paginated list of all orders with filtering and search capabilities. Only accessible by admin users.',
  })
  @ApiOkResponse({
    description: 'Orders retrieved successfully',
    schema: {
      example: {
        orders: [
          {
            id: 1,
            userId: 1,
            productId: 1,
            platform: 'Website',
            decidedPrice: 25000.5,
            advancePayment: false,
            customerName: 'John Doe',
            customerPhone: '+923001234567',
            customerWhatsapp: '+923001234567',
            customerEmail: 'customer@example.com',
            status: 'PENDING',
            createdAt: '2024-01-01T00:00:00.000Z',
            user: {
              id: 1,
              email: 'user@example.com',
              firstName: 'John',
              lastName: 'Doe',
            },
            product: {
              id: 1,
              title: 'Comfortable Leather Sofa',
              price: 25000.5,
              owner: {
                id: 2,
                email: 'seller@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
              },
            },
            payments: [],
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
  })
  async findAll(@Query() query: OrderQueryDto): Promise<PaginatedOrders> {
    return this.ordersService.findAll(query);
  }

  @Get('my-orders')
  @ApiOperation({
    summary: "Get current user's orders",
    description:
      'Retrieves a paginated list of orders created by the authenticated user',
  })
  @ApiOkResponse({
    description: 'User orders retrieved successfully',
    schema: {
      example: {
        orders: [
          {
            id: 1,
            userId: 1,
            productId: 1,
            platform: 'Website',
            decidedPrice: 25000.5,
            advancePayment: false,
            customerName: 'John Doe',
            customerPhone: '+923001234567',
            customerWhatsapp: '+923001234567',
            customerEmail: 'customer@example.com',
            status: 'PENDING',
            createdAt: '2024-01-01T00:00:00.000Z',
            user: {
              id: 1,
              email: 'user@example.com',
              firstName: 'John',
              lastName: 'Doe',
            },
            product: {
              id: 1,
              title: 'Comfortable Leather Sofa',
              price: 25000.5,
              owner: {
                id: 2,
                email: 'seller@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
              },
            },
            payments: [],
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
  async findUserOrders(
    @GetUser() user: User,
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedOrders> {
    return this.ordersService.findUserOrders(user.id, query);
  }

  @Get('statuses')
  @ApiOperation({
    summary: 'Get all order statuses',
    description:
      'Retrieves all available order statuses with their display names',
  })
  @ApiOkResponse({
    description: 'Order statuses retrieved successfully',
    schema: {
      example: [
        { value: 'PENDING', label: 'Pending' },
        { value: 'CONFIRMED', label: 'Confirmed' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'DELIVERED', label: 'Delivered' },
        { value: 'CANCELLED', label: 'Cancelled' },
        { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
        { value: 'PARTIALLY_DELIVERED', label: 'Partially Delivered' },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  getStatuses(): { value: string; label: string }[] {
    return this.ordersService.getStatuses();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get order statistics (Admin only)',
    description:
      'Retrieves comprehensive order statistics including counts by status and average order value',
  })
  @ApiOkResponse({
    description: 'Order statistics retrieved successfully',
    schema: {
      example: {
        totalOrders: 150,
        ordersByStatus: {
          PENDING: 45,
          CONFIRMED: 30,
          IN_PROGRESS: 25,
          DELIVERED: 40,
          CANCELLED: 10,
        },
        averageOrderValue: 18750.25,
        recentOrders: 12,
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
    totalOrders: number;
    ordersByStatus: Record<string, number>;
    averageOrderValue: number;
    recentOrders: number;
  }> {
    return this.ordersService.getOrderStats();
  }

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get orders for a specific product',
    description:
      'Retrieves all orders for a specific product. Only the product owner can access this endpoint.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Product orders retrieved successfully',
    schema: {
      example: {
        orders: [
          {
            id: 1,
            userId: 1,
            productId: 1,
            platform: 'Website',
            decidedPrice: 25000.5,
            advancePayment: false,
            customerName: 'John Doe',
            customerPhone: '+923001234567',
            customerWhatsapp: '+923001234567',
            customerEmail: 'customer@example.com',
            status: 'PENDING',
            createdAt: '2024-01-01T00:00:00.000Z',
            user: {
              id: 1,
              email: 'user@example.com',
              firstName: 'John',
              lastName: 'Doe',
            },
            product: {
              id: 1,
              title: 'Comfortable Leather Sofa',
              price: 25000.5,
              owner: {
                id: 2,
                email: 'seller@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
              },
            },
            payments: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiForbiddenResponse({
    description: 'You can only view orders for your own products',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only view orders for your own products',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async findProductOrders(
    @Param('productId', ParseIntPipe) productId: number,
    @GetUser() user: User,
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedOrders> {
    return this.ordersService.findProductOrders(productId, user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description:
      'Retrieves a specific order by its ID. Users can only access their own orders or orders for their products.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Order retrieved successfully',
    schema: {
      example: {
        id: 1,
        userId: 1,
        productId: 1,
        platform: 'Website',
        decidedPrice: 25000.5,
        advancePayment: false,
        customerName: 'John Doe',
        customerPhone: '+923001234567',
        customerWhatsapp: '+923001234567',
        customerEmail: 'customer@example.com',
        customerNotes: 'Please deliver between 2-4 PM',
        productName: 'Custom Leather Sofa',
        productDescription: 'Modified with custom cushions',
        customize_images: ['https://example.com/custom1.jpg'],
        deliveringDate: '2024-02-15T10:00:00.000Z',
        deliveryAddress: '123 Main Street, Karachi, Pakistan',
        deliveryDate: '2024-02-20T14:00:00.000Z',
        status: 'PENDING',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        product: {
          id: 1,
          title: 'Comfortable Leather Sofa',
          description: 'A beautiful leather sofa',
          price: 25000.5,
          category: 'SOFAS',
          condition: 'LIKE_NEW',
          photos: ['https://example.com/photo1.jpg'],
          owner: {
            id: 2,
            email: 'seller@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
        payments: [],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing access token',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderWithDetails> {
    return this.ordersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update order',
    description:
      'Updates an order. Users can update their own orders, product owners can update orders for their products, and admins can update any order.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: 1,
    type: 'integer',
  })
  @ApiOkResponse({
    description: 'Order updated successfully',
    schema: {
      example: {
        id: 1,
        userId: 1,
        productId: 1,
        platform: 'Website',
        decidedPrice: 25000.5,
        advancePayment: false,
        customerName: 'John Doe Updated',
        customerPhone: '+923001234567',
        customerWhatsapp: '+923001234567',
        customerEmail: 'customer.updated@example.com',
        customerNotes: 'Updated delivery instructions',
        productName: 'Custom Leather Sofa',
        productDescription: 'Modified with custom cushions',
        customize_images: ['https://example.com/custom1.jpg'],
        deliveringDate: '2024-02-15T10:00:00.000Z',
        deliveryAddress: '456 Updated Street, Karachi, Pakistan',
        deliveryDate: '2024-02-20T14:00:00.000Z',
        status: 'CONFIRMED',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        product: {
          id: 1,
          title: 'Comfortable Leather Sofa',
          description: 'A beautiful leather sofa',
          price: 25000.5,
          category: 'SOFAS',
          condition: 'LIKE_NEW',
          photos: ['https://example.com/photo1.jpg'],
          owner: {
            id: 2,
            email: 'seller@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
        payments: [],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  @ApiForbiddenResponse({
    description:
      'You can only update your own orders or orders for your products',
    schema: {
      example: {
        statusCode: 403,
        message:
          'You can only update your own orders or orders for your products',
        error: 'Forbidden',
      },
    },
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
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderWithDetails> {
    return this.ordersService.update(id, user.id, user.role, updateOrderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete order',
    description:
      'Deletes an order. Users can delete their own orders, product owners can delete orders for their products, and admins can delete any order.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: 1,
    type: 'integer',
  })
  @ApiNoContentResponse({
    description: 'Order deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  @ApiForbiddenResponse({
    description:
      'You can only delete your own orders or orders for your products',
    schema: {
      example: {
        statusCode: 403,
        message:
          'You can only delete your own orders or orders for your products',
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
    return this.ordersService.remove(id, user.id, user.role);
  }
}
