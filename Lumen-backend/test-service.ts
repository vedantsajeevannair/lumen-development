import { NestFactory } from '@nestjs/core';
import { AppModule } from './server/app.module';
import { WebIntegrationService } from './server/web-integration/web-integration.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(WebIntegrationService);
  const detail = await service.getComplaintDetail('8ec1b660-c181-4ed2-b043-d81ec9f4b8c7');
  console.log("Detail output:", JSON.stringify(detail, null, 2));
  await app.close();
}

main().catch(console.error);
