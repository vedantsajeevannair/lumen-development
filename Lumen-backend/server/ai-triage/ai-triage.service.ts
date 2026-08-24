import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AnalyzeComplaintDto } from './dto/analyze-complaint.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiTriageService {
  private readonly logger = new Logger(AiTriageService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async analyze(dto: AnalyzeComplaintDto) {
    this.logger.log(`Analyzing complaint with AI Triage...`);

    const inferenceUrl = this.configService.get<string>(
      'FASTAPI_INFERENCE_URL',
    );
    const apiKey = this.configService.get<string>('FASTAPI_API_KEY');

    if (inferenceUrl) {
      try {
        const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        const response = await firstValueFrom(
          this.httpService.post(`${inferenceUrl}/analyze`, dto, {
            headers,
            timeout: 5000,
          }),
        );

        const data = response.data;
        if (data && data.department) {
          this.logger.log(
            `Received successful response from FastAPI inference service.`,
          );
          return {
            success: true,
            triageResult: {
              department: data.department,
              category: data.category,
              priority: data.priority,
              confidenceScore: data.confidenceScore,
              aiSummary:
                data.aiSummary ||
                `AI analyzed the text and image and categorized it as ${data.category}.`,
              detections: data.detections || [],
            },
          };
        }
      } catch (error) {
        this.logger.error(`AI triage analysis failed: ${error.message}`);
        throw new ServiceUnavailableException(
          'FastAPI inference service is currently unavailable.',
        );
      }
    } else {
      throw new ServiceUnavailableException(
        'FastAPI inference URL is not configured.',
      );
    }
  }
}
