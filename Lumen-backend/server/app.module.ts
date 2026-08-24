import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthenticationModule } from './authentication/authentication.module';
import { CitizenModule } from './citizen/citizen.module';
import { DepartmentModule } from './department/department.module';
import { AdminModule } from './admin/admin.module';
import { ComplaintsModule } from './complaints/complaints.module';

import { TimelineModule } from './timeline/timeline.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MapsModule } from './maps/maps.module';
import { StorageModule } from './common/storage/storage.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { OtpModule } from './otp/otp.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { PaymentsModule } from './payments/payments.module';
import { AiTriageModule } from './ai-triage/ai-triage.module';
import { GamificationModule } from './gamification/gamification.module';
import { WebIntegrationModule } from './web-integration/web-integration.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport: undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // Max 100 requests per minute globally
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl =
          configService.get('REDIS_URL') || 'redis://localhost:6379';
        try {
          const store = await redisStore({
            url: redisUrl,
            ttl: 60000,
            socket: { connectTimeout: 1000 },
          });
          return { store };
        } catch (e) {
          console.warn(
            'Redis cache failed to connect, falling back to memory store',
          );
          return { ttl: 60000 }; // defaults to memory store
        }
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        let connectionOptions: any = null;
        if (redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            connectionOptions = {
              host: parsed.hostname,
              port: parseInt(parsed.port, 10),
              username: parsed.username || undefined,
              password: parsed.password || undefined,
            };
          } catch (e) {
            // Fallback if parsing fails
          }
        }
        if (!connectionOptions) {
          connectionOptions = {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
          };
        }

        const redisConnection = new Redis({
          ...connectionOptions,
          maxRetriesPerRequest: null,
          retryStrategy(times) {
            // Only retry once every hour in development to prevent console spam
            return 3600000;
          },
        });

        redisConnection.on('error', (err) => {
          console.warn(
            `[Redis Warning] Redis is offline. Queue and notification features will run in offline mode.`,
          );
        });

        return {
          connection: redisConnection as any,
        };
      },
      inject: [ConfigService],
    }),
    AuthenticationModule,
    CitizenModule,
    DepartmentModule,
    AdminModule,
    ComplaintsModule,

    TimelineModule,
    NotificationsModule,
    AnalyticsModule,
    MapsModule,
    StorageModule,
    AiModule,
    AuditModule,
    CommonModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    MailModule,
    OtpModule,
    DispatchModule,
    PaymentsModule,
    AiTriageModule,
    GamificationModule,
    WebIntegrationModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
