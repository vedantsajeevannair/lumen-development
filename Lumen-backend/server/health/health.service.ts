import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { getApps } from 'firebase-admin/app';
import Redis from 'ioredis';
import * as os from 'os';
import * as fs from 'fs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => 3600000,
      });
    } else {
      const redisHost =
        this.configService.get<string>('REDIS_HOST') || 'localhost';
      const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: 1,
        retryStrategy: () => 3600000,
      });
    }

    this.redisClient.on('error', (err) => {
      this.logger.warn(
        'Redis is offline. Health checks will report Redis status as down.',
      );
    });
  }

  async checkHealth() {
    const startTime = Date.now();

    const [db, redis, queue] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
    ]);

    const responseTime = Date.now() - startTime;

    return {
      status: db.status === 'up' && redis.status === 'up' ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: db,
        redis,
        queue,
        firebase: this.checkFirebase(),
        supabase: this.checkSupabase(),
        mapsApi: this.checkMapsApi(),
      },
      system: this.getSystemHealth(),
    };
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch (error: any) {
      this.logger.error('Database health check failed', error);
      return { status: 'down', error: error.message };
    }
  }

  private async checkRedis() {
    try {
      const ping = await this.redisClient.ping();
      return { status: ping === 'PONG' ? 'up' : 'down' };
    } catch (error: any) {
      this.logger.error('Redis health check failed', error);
      return { status: 'down', error: error.message };
    }
  }

  private async checkQueue() {
    try {
      const isPaused = await this.notificationsQueue.isPaused();
      return { status: 'up', isPaused };
    } catch (error: any) {
      this.logger.error('Queue health check failed', error);
      return { status: 'down', error: error.message };
    }
  }

  private checkFirebase() {
    const isInitialized = getApps().length > 0;
    return {
      status: isInitialized ? 'up' : 'down',
      initialized: isInitialized,
    };
  }

  private checkSupabase() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_ANON_KEY');
    const isConfigured = !!url && !!key;
    return { status: isConfigured ? 'up' : 'down', configured: isConfigured };
  }

  private checkMapsApi() {
    const key = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    return { status: key ? 'up' : 'down', configured: !!key };
  }

  private getSystemHealth() {
    const memUsage = process.memoryUsage();
    let diskUsage = 'unavailable';

    try {
      if (fs.statfsSync) {
        const rootPath =
          os.platform() === 'win32' ? process.cwd().substring(0, 3) : '/';
        const stats = fs.statfsSync(rootPath);
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        diskUsage = `${((total - free) / 1024 / 1024 / 1024).toFixed(2)} GB / ${(total / 1024 / 1024 / 1024).toFixed(2)} GB`;
      }
    } catch (e) {
      // Ignore disk space errors on environments where stats are not accessible
    }

    return {
      uptime: process.uptime(),
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
      cpu: {
        loadAvg: os.loadavg(),
        cores: os.cpus().length,
      },
      disk: diskUsage,
    };
  }
}
