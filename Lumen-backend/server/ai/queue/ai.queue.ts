import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { AI_PROCESSING_QUEUE, AI_JOB_NAMES } from '../ai.constants';

@Injectable()
export class AiQueueService {
  private readonly logger = new Logger(AiQueueService.name);

  constructor(
    @InjectQueue(AI_PROCESSING_QUEUE) private readonly aiQueue: Queue,
  ) {}

  private async safeAdd(jobName: string, data: any, opts: any) {
    try {
      // 1 second timeout to prevent hanging if Redis is offline
      await Promise.race([
        this.aiQueue.add(jobName, data, opts),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 1000),
        ),
      ]);
    } catch (e: any) {
      this.logger.warn(`Failed to queue ${jobName}: ${e.message}`);
      throw e;
    }
  }

  async queueVideoPrediction(complaintId: string, videoUrl: string) {
    this.logger.log(`Queueing video prediction for complaint: ${complaintId}`);
    await this.safeAdd(
      AI_JOB_NAMES.PREDICT_VIDEO,
      { complaintId, videoUrl },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async queueImagePrediction(complaintId: string, imageUrl: string) {
    this.logger.log(`Queueing image prediction for complaint: ${complaintId}`);
    await this.safeAdd(
      AI_JOB_NAMES.PREDICT_IMAGE,
      { complaintId, imageUrl },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async queueYoloPrediction(complaintId: string, imageUrl: string) {
    this.logger.log(`Queueing YOLO prediction for complaint: ${complaintId}`);
    await this.safeAdd(
      AI_JOB_NAMES.PREDICT_YOLO,
      { complaintId, imageUrl },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
