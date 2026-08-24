import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check application and system health' })
  @ApiResponse({ status: 200, description: 'Health check passed.' })
  @ApiResponse({ status: 503, description: 'Service unavailable.' })
  async checkHealth() {
    return this.healthService.checkHealth();
  }
}
