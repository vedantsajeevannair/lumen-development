import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiTriageService } from './ai-triage.service';
import { AnalyzeComplaintDto } from './dto/analyze-complaint.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('AI Triage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/ai-triage')
export class AiTriageController {
  constructor(private readonly aiTriageService: AiTriageService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze a civic complaint using AI models for smart routing',
  })
  async analyze(@Body() dto: AnalyzeComplaintDto) {
    return this.aiTriageService.analyze(dto);
  }
}
