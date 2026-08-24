import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check application and system health' })
  @ApiResponse({
    status: 200,
    description: 'Healthy, or degraded but serving.',
  })
  @ApiResponse({
    status: 503,
    description: 'Database unreachable — not ready.',
  })
  async checkHealth(@Res({ passthrough: true }) res: Response) {
    const health = await this.healthService.checkHealth();
    // passthrough keeps the diagnostic body while setting a status code that
    // load balancers and k8s readiness probes can act on.
    res.status(
      health.status === 'down' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK,
    );
    return health;
  }
}
