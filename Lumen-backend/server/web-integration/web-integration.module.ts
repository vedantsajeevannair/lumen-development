import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebIntegrationController } from './web-integration.controller';
import { WebIntegrationService } from './web-integration.service';
import { AuthenticationModule } from '../authentication/authentication.module';

@Module({
  imports: [HttpModule, AuthenticationModule],
  controllers: [WebIntegrationController],
  providers: [WebIntegrationService],
})
export class WebIntegrationModule {}
