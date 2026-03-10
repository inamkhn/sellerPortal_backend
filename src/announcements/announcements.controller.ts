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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  GetAnnouncementsDto,
} from './dto';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a new announcement (Admin only)',
    description:
      'Creates an announcement and sends notifications to all users except the admin',
  })
  @ApiResponse({
    status: 201,
    description: 'Announcement created successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createAnnouncement(
    @CurrentUser() admin: User,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.createAnnouncement(admin.id, dto);
  }

  @Post('system')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a system announcement (Admin only)',
    description: 'Creates a system announcement without sending notifications',
  })
  @ApiResponse({
    status: 201,
    description: 'System announcement created successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createSystemAnnouncement(
    @CurrentUser() admin: User,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.createSystemAnnouncement(admin.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get announcements for current user',
    description:
      'Returns active announcements relevant to the user based on their role',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements retrieved successfully',
  })
  async getAnnouncements(
    @CurrentUser() user: User,
    @Query() filters: GetAnnouncementsDto,
  ) {
    return this.announcementsService.getAnnouncementsForUser(
      user.id,
      user.role,
      filters,
    );
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get all announcements (Admin only)',
    description:
      'Returns all announcements including inactive and expired ones',
  })
  @ApiResponse({ status: 200, description: 'All announcements retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getAllAnnouncements(@Query() filters: GetAnnouncementsDto) {
    return this.announcementsService.getAllAnnouncements(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiResponse({ status: 200, description: 'Announcement retrieved' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async getAnnouncementById(@Param('id', ParseIntPipe) id: number) {
    return this.announcementsService.getAnnouncementById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an announcement (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Announcement updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateAnnouncement(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.updateAnnouncement(id, admin.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an announcement (Admin only)',
    description: 'Deletes the announcement and related notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteAnnouncement(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.announcementsService.deleteAnnouncement(id, admin.id);
  }
}
