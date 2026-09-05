import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiProperty,
} from '@nestjs/swagger';

// The class-validator decorators are load-bearing, not decoration. main.ts
// registers ValidationPipe with { whitelist: true, forbidNonWhitelisted: true },
// which keeps only properties carrying a validation decorator and then rejects
// the request for every property it stripped. A DTO annotated purely with
// @ApiProperty (a Swagger concern, invisible to class-validator) therefore
// whitelists nothing, and every request 400s with "property X should not exist".
class AnalyzeTextDto {
  @ApiProperty({ description: 'The text of the complaint to analyze' })
  @IsString()
  @IsNotEmpty()
  description: string;
}

class PredictMediaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  complaintId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mediaUrl: string;
}

@ApiTags('AI / ML Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze-complaint')
  @ApiOperation({
    summary: 'Analyze complaint text using AI to suggest category and priority',
  })
  analyzeComplaint(@Body() body: AnalyzeTextDto) {
    return this.aiService.analyzeComplaintText(body.description);
  }

  @Post('predict/image')
  @ApiOperation({
    summary:
      'Synchronously predict damage class and bounding boxes for an image URL',
  })
  predictImage(@Body() body: PredictMediaDto) {
    return this.aiService.processImagePrediction(
      body.complaintId,
      body.mediaUrl,
    );
  }

  @Post('predict/video')
  @ApiOperation({ summary: 'Queue a video for asynchronous AI analysis' })
  predictVideo(@Body() body: PredictMediaDto) {
    return this.aiService.queueVideoPrediction(body.complaintId, body.mediaUrl);
  }

  @Get('prediction/:complaintId')
  @ApiOperation({
    summary: 'Fetch AI prediction results for a specific complaint',
  })
  getPrediction(@Param('complaintId') complaintId: string) {
    return this.aiService.getPrediction(complaintId);
  }
}
