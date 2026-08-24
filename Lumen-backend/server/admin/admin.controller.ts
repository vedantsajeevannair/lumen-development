import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get global admin dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users in the system' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  async getUsers(@Query('page') page?: number) {
    return this.adminService.getAllUsers(page ? Number(page) : 1);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user (provision internal users)' })
  async createUser(@CurrentUser() admin: User, @Body() dto: CreateUserDto) {
    return this.adminService.createUser(admin.id, dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update an existing user' })
  async updateUser(
    @CurrentUser() admin: User,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(admin.id, userId, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft delete a user' })
  async deleteUser(@CurrentUser() admin: User, @Param('id') userId: string) {
    return this.adminService.softDeleteUser(admin.id, userId);
  }

  @Get('complaints')
  @ApiOperation({ summary: 'Get all complaints' })
  @ApiQuery({ name: 'department', required: false })
  async getComplaints(@Query('department') department?: string) {
    return this.adminService.getAllComplaints(department);
  }

  @Patch('complaints/:id/status')
  @ApiOperation({ summary: 'Update complaint status' })
  async updateComplaintStatus(
    @CurrentUser() admin: User,
    @Param('id') complaintId: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.updateComplaintStatus(
      admin.id,
      complaintId,
      status,
      notes,
    );
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get paginated system audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAuditLogs(
      Number(page) || 1,
      Number(limit) || 50,
    );
  }
}
