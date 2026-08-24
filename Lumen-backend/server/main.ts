import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || [
      'http://localhost:5173',
      'http://localhost:8081',
      'http://localhost:19006',
      'exp://10.24.81.55:8081',
      'http://10.24.81.55:8081',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Logger
  app.useLogger(app.get(Logger));

  // 4. Global Validation and Transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 5. Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // 6. Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('LUMEN API')
    .setDescription('LUMEN Smart City Platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 7. Start Server
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`LUMEN Backend is running on port ${port}`);
}
bootstrap();
