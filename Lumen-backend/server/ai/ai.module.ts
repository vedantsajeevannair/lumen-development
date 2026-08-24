import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiRepository } from './ai.repository';
import { AiQueueService } from './queue/ai.queue';
import { AiProcessor } from './queue/ai.processor';
import { AI_PROCESSING_QUEUE } from './ai.constants';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: AI_PROCESSING_QUEUE,
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiRepository, AiQueueService, AiProcessor],
  exports: [AiService],
})
export class AiModule {}
