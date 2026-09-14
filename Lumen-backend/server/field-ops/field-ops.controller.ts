import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FieldOpsService } from './field-ops.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

/**
 * Mounted under `api/` alongside WebIntegrationController rather than inside
 * it: these routes came from a different backend and are a coherent feature of
 * their own (site survey → bill of quantities → reopen), so they read better
 * together than appended to a controller that is already the largest file in
 * the project.
 */
@ApiTags('Field operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class FieldOpsController {
  constructor(private readonly fieldOps: FieldOpsService) {}

  @Post('complaints/:ref/measurements')
  @UseGuards(RolesGuard)
  @Roles(Role.ENGINEER, Role.SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record measured pothole geometry for a complaint' })
  async recordMeasurements(
    @Param('ref') ref: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.fieldOps.recordMeasurements(ref, body, user);
  }

  @Get('complaints/:ref/estimate')
  @ApiOperation({ summary: 'Bill of quantities from the recorded measurements' })
  async estimate(@Param('ref') ref: string, @Query('wastage') wastage?: string) {
    return this.fieldOps.estimate(ref, wastage);
  }

  @Get('complaints/:ref/suggest-dimensions')
  @ApiOperation({
    summary: 'First-pass dimensions read off the photograph (always ESTIMATED)',
  })
  async suggestDimensions(@Param('ref') ref: string) {
    return this.fieldOps.suggestDimensions(ref);
  }

  @Post('complaints/:ref/reopen')
  @UseGuards(RolesGuard)
  @Roles(Role.CITIZEN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resident disputes that the repair was done' })
  async reopen(
    @Param('ref') ref: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.fieldOps.reopen(ref, body?.reason ?? '', user);
  }

  @Get('clusters')
  @ApiOperation({ summary: 'Open complaints grouped into work orders' })
  async clusters() {
    return this.fieldOps.clusters();
  }

  @Get('estimate')
  @ApiOperation({
    summary: 'Bill of quantities across every measured complaint in the backlog',
  })
  async backlogEstimate(@Query('wastage') wastage?: string) {
    return this.fieldOps.backlogEstimate(wastage);
  }

  @Get('plan')
  @ApiOperation({
    summary: 'Which repairs fit a budget, and the route each crew should drive',
  })
  async budgetPlan(
    @Query('budget') budget?: string,
    @Query('crews') crews?: string,
    @Query('horizon') horizon?: string,
  ) {
    return this.fieldOps.budgetPlan(budget, crews, horizon);
  }

  @Get('notifications')
  @ApiOperation({ summary: "The signed-in user's in-app notifications" })
  async notifications(@CurrentUser() user: any) {
    return this.fieldOps.listNotifications(user.id);
  }

  @Post('notifications/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one notification read, or all of them' })
  async markRead(@Body() body: { id?: string }, @CurrentUser() user: any) {
    return this.fieldOps.markNotificationsRead(user.id, body?.id);
  }
}
