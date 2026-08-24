import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiTriageController } from './ai-triage.controller';
import { AiTriageService } from './ai-triage.service';

@Module({
  imports: [HttpModule],
  controllers: [AiTriageController],
  providers: [AiTriageService],
})
export class AiTriageModule {}
