import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  AI_PROCESSING_QUEUE,
  AI_JOB_NAMES,
  AI_PREDICTION_STATUS,
} from '../ai.constants';
import { AiService } from '../ai.service';

@Processor(AI_PROCESSING_QUEUE)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case AI_JOB_NAMES.PREDICT_VIDEO:
        return this.handlePredictVideo(job);
      case AI_JOB_NAMES.PREDICT_IMAGE:
        return this.handlePredictImage(job);
      case AI_JOB_NAMES.PREDICT_YOLO:
        return this.handlePredictYolo(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }

  private async handlePredictVideo(
    job: Job<{ complaintId: string; videoUrl: string }>,
  ) {
    const { complaintId, videoUrl } = job.data;
    try {
      this.logger.log(`Running async video prediction for ${complaintId}`);
      await this.aiService.processVideoPrediction(complaintId, videoUrl);
      this.logger.log(`Completed async video prediction for ${complaintId}`);
    } catch (error) {
      this.logger.error(
        `Error processing video prediction for ${complaintId}: ${error.message}`,
      );
      await this.aiService.markPredictionFailed(complaintId, error.message);
      throw error;
    }
  }

  private async handlePredictImage(
    job: Job<{ complaintId: string; imageUrl: string }>,
  ) {
    const { complaintId, imageUrl } = job.data;
    try {
      this.logger.log(`Running async image prediction for ${complaintId}`);
      await this.aiService.processImagePrediction(complaintId, imageUrl);
      this.logger.log(`Completed async image prediction for ${complaintId}`);
    } catch (error) {
      this.logger.error(
        `Error processing image prediction for ${complaintId}: ${error.message}`,
      );
      await this.aiService.markPredictionFailed(complaintId, error.message);
      throw error;
    }
  }

  private async handlePredictYolo(
    job: Job<{ complaintId: string; imageUrl: string }>,
  ) {
    const { complaintId, imageUrl } = job.data;
    try {
      this.logger.log(`Running async YOLO prediction for ${complaintId}`);
      await this.aiService.processYoloPrediction(complaintId, imageUrl);
      this.logger.log(`Completed async YOLO prediction for ${complaintId}`);
    } catch (error) {
      this.logger.error(
        `Error processing YOLO prediction for ${complaintId}: ${error.message}`,
      );
      await this.aiService.markPredictionFailed(complaintId, error.message);
      throw error;
    }
  }
}
