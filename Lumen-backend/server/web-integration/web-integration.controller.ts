import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  AnyFilesInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { WebIntegrationService } from './web-integration.service';
import { AuthenticationService } from '../authentication/authentication.service';
import { RefreshTokenDto } from '../authentication/dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { toPublicUser } from '../common/public-user';

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

  // Unauthenticated on purpose: the access token is already expired by the time
  // the browser calls this. The refresh token itself is the credential, and it is
  // single-use — authService.refreshTokens rotates it on every call.
  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body);
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
    return { user: toPublicUser(req.user) };
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

  // The web form posts multipart/form-data — the photograph is the point of the
  // report, not an optional extra. Without FileInterceptor the body arrives
  // unparsed, every field reads as undefined, and Prisma rejects the missing
  // title as a bare 500 that says nothing about the real cause.
  //
  // AnyFilesInterceptor rather than FileInterceptor('photo'): the console posts
  // under "photos" because it supports several angles of the same defect, while
  // the mobile app posts a single "photo". Binding to one field name means
  // whichever client did not choose it silently uploads nothing and the report
  // is rejected for having no photograph.
  //
  // Only the first file is stored — this schema holds one imageUrl per
  // complaint. The extra angles are accepted and dropped rather than refused,
  // because losing the secondary views is better than losing the report.
  @UseGuards(JwtAuthGuard)
  @Post('complaints')
  @UseInterceptors(AnyFilesInterceptor())
  async createComplaint(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: any,
  ) {
    return this.integrationService.createComplaint(body, user.id, files?.[0]);
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
