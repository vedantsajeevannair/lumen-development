import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { AssignDispatchDto } from './dto/assign-dispatch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('assign')
  @ApiOperation({ summary: 'Assign a complaint to a municipal department' })
  async assign(@Body() dto: AssignDispatchDto, @CurrentUser() user: User) {
    return this.dispatchService.assign(dto, user);
  }

  @Get(':complaintId')
  @ApiOperation({ summary: 'Get dispatch details for a specific complaint' })
  async getDispatchDetails(@Param('complaintId') complaintId: string) {
    return this.dispatchService.getDispatchDetails(complaintId);
  }
}
