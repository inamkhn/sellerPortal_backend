import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  GetUsersQueryDto,
  UpdateUserDto,
  UpdateProfileDto,
  UpdateRoleDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/admin/users
   * Get paginated list of users with filters
   */
  @Get()
  async getUsers(@Query(ValidationPipe) query: GetUsersQueryDto) {
    return await this.usersService.getUsers(query);
  }

  /**
   * GET /api/admin/users/export
   * Export users to CSV
   */
  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="users-export.csv"')
  async exportUsers(@Query(ValidationPipe) query: GetUsersQueryDto) {
    return await this.usersService.exportUsers(query);
  }

  /**
   * GET /api/admin/users/:id
   * Get user detail with statistics
   */
  @Get(':id')
  async getUserDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getUserDetail(id);
  }

  /**
   * GET /api/admin/users/:id/orders
   * Get user orders
   */
  @Get(':id/orders')
  async getUserOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return await this.usersService.getUserOrders(id, page, limit);
  }

  /**
   * GET /api/admin/users/:id/settlements
   * Get user settlements
   */
  @Get(':id/settlements')
  async getUserSettlements(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return await this.usersService.getUserSettlements(id, page, limit);
  }

  /**
   * GET /api/admin/users/:id/referrals
   * Get user referrals (REFERRAL_MANAGER only)
   */
  @Get(':id/referrals')
  async getUserReferrals(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getUserReferrals(id);
  }

  /**
   * PATCH /api/admin/users/:id
   * Update user information
   */
  @Patch(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.updateUser(id, updateUserDto);
  }

  /**
   * PATCH /api/admin/users/:id/profile
   * Update user profile
   */
  @Patch(':id/profile')
  updateProfile(
    @Param('id', ParseIntPipe) _id: number,
    @Body(ValidationPipe) _updateProfileDto: UpdateProfileDto,
  ) {
    // This would need to be implemented in the service
    // For now, we can return a not implemented response
    return { message: 'Profile update endpoint - to be implemented' };
  }

  /**
   * PATCH /api/admin/users/:id/role
   * Change user role
   */
  @Patch(':id/role')
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateRoleDto: UpdateRoleDto,
  ) {
    return await this.usersService.updateUserRole(id, updateRoleDto);
  }

  /**
   * PATCH /api/admin/users/:id/verify
   * Verify user account
   */
  @Patch(':id/verify')
  async verifyUser(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.verifyUser(id);
  }

  /**
   * DELETE /api/admin/users/:id
   * Delete user account
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.deleteUser(id);
  }
}
