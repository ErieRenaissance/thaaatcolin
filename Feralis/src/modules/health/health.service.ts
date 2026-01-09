// =============================================================================
// FERALIS PLATFORM - HEALTH CHECK SERVICE
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    storage?: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down';
  latency?: number;
  message?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const [database, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allUp = database.status === 'up' && redisStatus.status === 'up';
    const anyDown = database.status === 'down' || redisStatus.status === 'down';

    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (allUp) {
      status = 'healthy';
    } else if (anyDown) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database,
        redis: redisStatus,
      },
    };
  }

  async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.redis.set('health:ping', 'pong', 10);
      const result = await this.redis.get('health:ping');
      if (result === 'pong') {
        return {
          status: 'up',
          latency: Date.now() - start,
        };
      }
      return {
        status: 'down',
        message: 'Unexpected response from Redis',
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  async getLiveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  async getReadiness(): Promise<{ status: string; ready: boolean }> {
    const health = await this.getHealth();
    return {
      status: health.status === 'healthy' ? 'ok' : 'not ready',
      ready: health.status === 'healthy',
    };
  }
}
