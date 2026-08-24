import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  Req,
  Delete,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { SyncComplaintsDto } from './dto/sync-complaints.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as PrismaClient from '@prisma/client';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('Complaints')
@ApiBearerAuth()
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Report a new complaint using pre-uploaded media URLs',
  })
  create(
    @Body() createComplaintDto: CreateComplaintDto,
    @CurrentUser() user: PrismaClient.User,
  ) {
    return this.complaintsService.create(createComplaintDto, user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('test-auth')
  testAuth(@CurrentUser() user: PrismaClient.User | null, @Req() req: any) {
    return {
      user,
      headers: req.headers,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  @ApiOperation({
    summary: 'Synchronize an array of complaints created while offline',
  })
  sync(
    @Body() syncDto: SyncComplaintsDto,
    @CurrentUser() user: PrismaClient.User,
  ) {
    return this.complaintsService.sync(syncDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds
  @Get()
  @ApiOperation({ summary: 'Get all complaints' })
  findAll() {
    return this.complaintsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds
  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby complaints using PostGIS' })
  findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number,
  ) {
    return this.complaintsService.findNearby(
      lat,
      lng,
      radius ? Number(radius) : 5,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get complaint details by ID' })
  findOne(@Param('id') id: string) {
    return this.complaintsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a complaint' })
  update(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
  ) {
    return this.complaintsService.update(id, updateComplaintDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a complaint by ID' })
  remove(@Param('id') id: string, @CurrentUser() user: PrismaClient.User) {
    return this.complaintsService.remove(id, user);
  }
}
