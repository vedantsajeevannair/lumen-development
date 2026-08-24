import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AiRepository } from './ai.repository';
import { AiQueueService } from './queue/ai.queue';
import { FastApiPredictionResponse } from './ai.interface';
import { AI_PREDICTION_STATUS } from './ai.constants';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly aiRepository: AiRepository,
    private readonly aiQueueService: AiQueueService,
  ) {}

  async analyzeComplaintText(description: string) {
    const inferenceUrl = this.configService.get<string>(
      'FASTAPI_INFERENCE_URL',
    );
    const apiKey = this.configService.get<string>('FASTAPI_API_KEY');

    if (inferenceUrl) {
      try {
        const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        const response = await firstValueFrom(
          this.httpService.post(
            `${inferenceUrl}/analyze`,
            { description },
            { headers, timeout: 5000 },
          ),
        );

        const data = response.data;
        if (data && data.category) {
          this.logger.log(
            `Received successful text analysis from FastAPI service.`,
          );
          return {
            suggestedPriority: data.priority || 'MEDIUM',
            suggestedCategory: data.category || 'GENERAL',
            confidenceScore: data.confidenceScore || 0.85,
          };
        }
      } catch (error) {
        this.logger.error(`FastAPI text analysis failed: ${error.message}`);
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

  async validateComplaintImageSync(
    imageUrl: string,
    category: string,
  ): Promise<FastApiPredictionResponse> {
    this.logger.log(`Synchronously validating image for category: ${category}`);

    const inferenceUrl = this.configService.get<string>(
      'FASTAPI_INFERENCE_URL',
    );
    const apiKey = this.configService.get<string>('FASTAPI_API_KEY');

    if (!inferenceUrl) {
      throw new ServiceUnavailableException('FASTAPI_INFERENCE_URL not set.');
    }

    try {
      const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
      const response = await firstValueFrom(
        this.httpService.post<FastApiPredictionResponse>(
          `${inferenceUrl}/detect/image`,
          { url: imageUrl },
          { headers, timeout: 30000 },
        ),
      );

      const data = response.data;

      // 1. Blur Validation
      if (data.is_blurry) {
        throw new Error('Photo is too blurry. Please capture a clearer photo.');
      }

      // 2. Strict Irrelevance Validation
      if (data.damageClass === 'UNKNOWN') {
        throw new Error(
          'it is not the valid photo for your complain upload it again with the photo related to it',
        );
      }

      this.logger.log(
        `AI Validation Passed - Detected: ${data.damageClass} (Confidence: ${data.confidenceScore})`,
      );

      return data;
    } catch (error) {
      this.logger.error(`Synchronous validation failed: ${error.message}`);
      // Re-throw so ComplaintsService can catch and throw BadRequestException
      throw error;
    }
  }

  async processImagePrediction(complaintId: string, imageUrl: string) {
    this.logger.log(
      `Processing image prediction for complaint: ${complaintId}`,
    );

    // First save as PENDING
    await this.aiRepository.createOrUpdatePrediction({
      complaintId,
      damageClass: 'UNKNOWN',
      confidenceScore: 0,
      boundingBoxes: [],
      metadata: { processingTimeMs: 0, device: 'unknown', type: 'image' },
      status: AI_PREDICTION_STATUS.PENDING,
    });

    const inferenceUrl = this.configService.get<string>(
      'FASTAPI_INFERENCE_URL',
    );
    const apiKey = this.configService.get<string>('FASTAPI_API_KEY');

    try {
      const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
      this.logger.log('Calling FastAPI');
      const response = await firstValueFrom(
        this.httpService.post<FastApiPredictionResponse>(
          `${inferenceUrl}/detect/image`,
          { url: imageUrl },
          { headers },
        ),
      );

      this.logger.log('AI completed');
      await this.aiRepository.updateComplaintWithAiResult(
        complaintId,
        response.data,
      );

      return this.aiRepository.createOrUpdatePrediction({
        complaintId,
        damageClass: response.data.damageClass,
        confidenceScore: response.data.confidenceScore,
        boundingBoxes: response.data.boundingBoxes,
        metadata: response.data.metadata,
        status: AI_PREDICTION_STATUS.COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        `Failed image inference for ${complaintId}: ${error.message}`,
      );
      return this.aiRepository.markPredictionAsFailed(
        complaintId,
        error.message,
      );
    }
  }

  async queueVideoPrediction(complaintId: string, videoUrl: string) {
    await this.aiRepository.createOrUpdatePrediction({
      complaintId,
      damageClass: 'UNKNOWN',
      confidenceScore: 0,
      boundingBoxes: [],
      metadata: { processingTimeMs: 0, device: 'unknown', type: 'video' },
      status: AI_PREDICTION_STATUS.PENDING,
    });

    try {
      await this.aiQueueService.queueVideoPrediction(complaintId, videoUrl);
      return {
        status: AI_PREDICTION_STATUS.PENDING,
        message: 'Video queued for analysis',
      };
    } catch (e) {
      this.logger.warn(
        `Redis offline, running video prediction directly in background for ${complaintId}`,
      );
      this.processVideoPrediction(complaintId, videoUrl).catch((err) =>
        this.logger.error(`Direct video prediction failed: ${err.message}`),
      );
      return {
        status: AI_PREDICTION_STATUS.PENDING,
        message: 'Video analysis started directly',
      };
    }
  }

  async processVideoPrediction(complaintId: string, videoUrl: string) {
    this.logger.log(
      `Processing video prediction for complaint: ${complaintId}`,
    );

    const inferenceUrl = this.configService.get<string>(
      'FASTAPI_INFERENCE_URL',
    );
    const apiKey = this.configService.get<string>('FASTAPI_API_KEY');

    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const response = await firstValueFrom(
      this.httpService.post<FastApiPredictionResponse>(
        `${inferenceUrl}/detect/video`,
        { url: videoUrl },
        { headers },
      ),
    );

    await this.aiRepository.updateComplaintWithAiResult(
      complaintId,
      response.data,
    );

    await this.aiRepository.createOrUpdatePrediction({
      complaintId,
      damageClass: response.data.damageClass,
      confidenceScore: response.data.confidenceScore,
      boundingBoxes: response.data.boundingBoxes,
      metadata: response.data.metadata,
      status: AI_PREDICTION_STATUS.COMPLETED,
    });
  }

  async queueImagePrediction(complaintId: string, imageUrl: string) {
    await this.aiRepository.createOrUpdatePrediction({
      complaintId,
      damageClass: 'UNKNOWN',
      confidenceScore: 0,
      boundingBoxes: [],
      metadata: { processingTimeMs: 0, device: 'unknown', type: 'image' },
      status: AI_PREDICTION_STATUS.PENDING,
    });
    try {
      await this.aiQueueService.queueImagePrediction(complaintId, imageUrl);
      return {
        status: AI_PREDICTION_STATUS.PENDING,
        message: 'Image queued for analysis',
      };
    } catch (e) {
      this.logger.warn(
        `Redis offline, running image prediction directly in background for ${complaintId}`,
      );
      this.processImagePrediction(complaintId, imageUrl).catch((err) =>
        this.logger.error(`Direct image prediction failed: ${err.message}`),
      );
      return {
        status: AI_PREDICTION_STATUS.PENDING,
        message: 'Image analysis started directly',
      };
    }
  }

  async queueYoloPrediction(complaintId: string, imageUrl: string) {
    await this.aiRepository.createOrUpdatePrediction({
      complaintId,
      damageClass: 'UNKNOWN',
      confidenceScore: 0,
      boundingBoxes: [],
      metadata: { processingTimeMs: 0, device: 'unknown', type: 'yolo' },
      status: AI_PREDICTION_STATUS.PENDING,
    });
    try {
      await this.aiQueueService.queueYoloPrediction(complaintId, imageUrl);
      return {
        status: AI_PREDICTION_STATUS.PENDING,
        message: 'YOLO prediction queued',
      };
    } catch (e) {
      this.logger.warn(
        `Redis offline, running YOLO prediction directly in background for ${complaintId}`,
      );
      this.processYoloPrediction(complaintId, imageUrl).catch((err) =>
        this.logger.error(`Direct YOLO prediction failed: ${err.message}`),
      );
      return {
        status: AI_PREDICTION_STATUS.PENDING,
        message: 'YOLO analysis started directly',
      };
    }
  }

  async processYoloPrediction(complaintId: string, imageUrl: string) {
    this.logger.log(`Processing YOLO prediction for complaint: ${complaintId}`);
    const inferenceUrl = this.configService.get<string>(
      'FASTAPI_INFERENCE_URL',
    );
    const apiKey = this.configService.get<string>('FASTAPI_API_KEY');

    try {
      const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
      const response = await firstValueFrom(
        this.httpService.post<FastApiPredictionResponse>(
          `${inferenceUrl}/detect/image`,
          { url: imageUrl },
          { headers },
        ),
      );

      await this.aiRepository.updateComplaintWithAiResult(
        complaintId,
        response.data,
      );

      await this.aiRepository.createOrUpdatePrediction({
        complaintId,
        damageClass: response.data.damageClass,
        confidenceScore: response.data.confidenceScore,
        boundingBoxes: response.data.boundingBoxes,
        metadata: response.data.metadata,
        status: AI_PREDICTION_STATUS.COMPLETED,
      });
    } catch (error) {
      this.logger.error(
        `Failed YOLO inference for ${complaintId}: ${error.message}`,
      );
      await this.aiRepository.markPredictionAsFailed(
        complaintId,
        error.message,
      );
    }
  }

  async markPredictionFailed(complaintId: string, reason: string) {
    return this.aiRepository.markPredictionAsFailed(complaintId, reason);
  }

  async getPrediction(complaintId: string) {
    return this.aiRepository.getPredictionByComplaintId(complaintId);
  }

  async updateComplaintWithAiResult(complaintId: string, result: any) {
    return this.aiRepository.updateComplaintWithAiResult(complaintId, result);
  }
}
