import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CitizenService } from './citizen.service';
import { UpdateCitizenProfileDto } from './dto/update-citizen-profile.dto';
import { VerifyIdentityDto } from './dto/verify-identity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Citizen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CITIZEN)
@Controller('api/v1/citizen')
export class CitizenController {
  constructor(private readonly citizenService: CitizenService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get citizen dashboard statistics' })
  async getDashboard(@CurrentUser() user: User) {
    return this.citizenService.getDashboard(user.id);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get scoped analytics data for the citizen' })
  async getAnalytics(
    @CurrentUser() user: User,
    @Query('range') range?: string,
  ) {
    return this.citizenService.getAnalytics(user.id, range);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get citizen profile details' })
  async getProfile(@CurrentUser() user: User) {
    return this.citizenService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update citizen profile, preferences, or saved locations',
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateCitizenProfileDto,
  ) {
    return this.citizenService.updateProfile(user.id, updateDto);
  }

  @Get('complaints')
  @ApiOperation({
    summary: 'Get history of complaints reported by the citizen',
  })
  async getComplaints(@CurrentUser() user: User) {
    return this.citizenService.getComplaints(user.id);
  }

  @Get('complaints/:id/tracking')
  @ApiOperation({
    summary: 'Get the tracking timeline of a specific complaint',
  })
  async getComplaintTracking(
    @CurrentUser() user: User,
    @Param('id') complaintId: string,
  ) {
    return this.citizenService.getComplaintTracking(user.id, complaintId);
  }

  @Post('verify-identity')
  @ApiOperation({
    summary: 'Submit KYC documents to verify citizen identity',
  })
  async verifyIdentity(
    @CurrentUser() user: User,
    @Body() verifyDto: VerifyIdentityDto,
  ) {
    return this.citizenService.verifyIdentity(user.id, verifyDto);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Get all municipal bill payments for the citizen',
  })
  async getPayments(@CurrentUser() user: User) {
    return this.citizenService.getPayments(user.id);
  }

  @Post('payments/:id/pay')
  @ApiOperation({
    summary: 'Simulate paying a municipal bill',
  })
  async payBill(@CurrentUser() user: User, @Param('id') paymentId: string) {
    return this.citizenService.payBill(user.id, paymentId);
  }
}
