import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WebIntegrationService } from './web-integration.service';
import { AuthenticationService } from '../authentication/authentication.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api')
export class WebIntegrationController {
  constructor(
    private readonly integrationService: WebIntegrationService,
    private readonly authService: AuthenticationService,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.authService.login({
      email: body.email,
      password: body.password,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Body() body: any) {
    return this.authService.logout(req.user.id, body?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  async getMe(@Req() req: any) {
    return { user: req.user };
  }

  @Get('health')
  async getHealth() {
    return this.integrationService.queryHealth();
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard() {
    return this.integrationService.getDashboard();
  }

  @UseGuards(JwtAuthGuard)
  @Get('complaints')
  async getComplaints(
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.integrationService.getComplaints(status, q);
  }

  @UseGuards(JwtAuthGuard)
  @Post('complaints')
  async createComplaint(@Body() body: any, @CurrentUser() user: any) {
    return this.integrationService.createComplaint(body, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('complaints/:ref')
  async getComplaintDetail(@Param('ref') ref: string) {
    return this.integrationService.getComplaintDetail(ref);
  }

  @UseGuards(JwtAuthGuard)
  @Post('complaints/:ref/transition')
  async transitionComplaint(
    @Param('ref') ref: string,
    @Body('to') to: string,
    @CurrentUser() user: any,
  ) {
    return this.integrationService.transitionComplaint(ref, to, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('complaints/:ref/duplicate')
  async resolveDuplicate(
    @Param('ref') ref: string,
    @Body('action') action: string,
    @CurrentUser() user: any,
  ) {
    return this.integrationService.resolveDuplicate(ref, action, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('complaints/:ref/verify')
  @UseInterceptors(FileInterceptor('photo'))
  async verifyRepair(
    @Param('ref') ref: string,
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    return this.integrationService.verifyRepair(ref, file, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assignment')
  async getAssignmentProposal() {
    return this.integrationService.getAssignmentProposal();
  }

  @UseGuards(JwtAuthGuard)
  @Post('assignment/apply')
  async applyAssignments(@CurrentUser() user: any) {
    return this.integrationService.applyAssignments(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('gis')
  async getGisData() {
    return this.integrationService.getGisData();
  }

  @UseGuards(JwtAuthGuard)
  @Get('engineers')
  async getEngineers() {
    return this.integrationService.getEngineers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('audit-logs')
  async getAuditLogs() {
    return this.integrationService.getAuditLogs();
  }
}
