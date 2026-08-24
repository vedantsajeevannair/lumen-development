import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Maps (GeoJSON)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('complaints.geojson')
  @ApiOperation({
    summary: 'Get complaints as a GeoJSON FeatureCollection for map rendering',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by complaint status',
  })
  getComplaintsGeoJSON(@Query('status') status?: string) {
    return this.mapsService.getComplaintsGeoJSON(status);
  }
}
