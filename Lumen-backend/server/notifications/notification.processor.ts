import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PushNotificationData } from './notifications.service';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<PushNotificationData, any, string>): Promise<any> {
    this.logger.log(`Processing notification job ${job.id}`);
    const { token, title, body, data } = job.data;

    try {
      if (getApps().length > 0) {
        const response = await getMessaging().send({
          token,
          notification: { title, body },
          data,
        });
        this.logger.log(`Successfully sent message: ${response}`);
        return response;
      } else {
        this.logger.warn(
          'Firebase not initialized. Skipped push notification.',
        );
      }
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }
}
