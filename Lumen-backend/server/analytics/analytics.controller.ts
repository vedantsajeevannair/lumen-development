import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEPARTMENT, Role.SUPERVISOR, Role.SUPER_ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get high-level dashboard KPI statistics' })
  getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get daily complaint submission trend for the past N days' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default 7)' })
  getComplaintTrend(@Query('days') days?: string) {
    return this.analyticsService.getComplaintTrend(days ? parseInt(days, 10) : 7);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get per-department resolution performance metrics' })
  getDepartmentPerformance() {
    return this.analyticsService.getDepartmentPerformance();
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity from audit logs and complaint timelines' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 20)' })
  getRecentActivity(@Query('limit') limit?: string) {
    return this.analyticsService.getRecentActivity(limit ? parseInt(limit, 10) : 20);
  }

  @Get('sla')
  @ApiOperation({ summary: 'Get SLA breach metrics for complaints over 48 hours' })
  getSlaMetrics() {
    return this.analyticsService.getSlaMetrics();
  }
}
