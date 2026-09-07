import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebIntegrationController } from './web-integration.controller';
import { WebIntegrationService } from './web-integration.service';
import { AuthenticationModule } from '../authentication/authentication.module';
import { StorageModule } from '../common/storage/storage.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [HttpModule, AuthenticationModule, StorageModule, AiModule],
  controllers: [WebIntegrationController],
  providers: [WebIntegrationService],
})
export class WebIntegrationModule {}
