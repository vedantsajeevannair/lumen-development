import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('gamification')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CacheInterceptor)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard')
  @Roles('CITIZEN', 'ADMIN')
  async getLeaderboard() {
    return this.gamificationService.getLeaderboard(10);
  }

  @Get('profile/me')
  @Roles('CITIZEN')
  async getMyProfile(@Req() req) {
    return this.gamificationService.getUserProfile(req.user.id);
  }

  @Get('profile/:userId')
  @Roles('ADMIN')
  async getUserProfile(@Param('userId') userId: string) {
    return this.gamificationService.getUserProfile(userId);
  }
}
