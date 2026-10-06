import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../../core/auth/public.decorator';
import { PostgresHealthIndicator, RedisHealthIndicator } from './health.indicators';

function indicatorIsUp(result: HealthIndicatorResult): boolean {
  const entry = Object.values(result)[0];
  if (entry === undefined || typeof entry !== 'object') {
    return false;
  }
  return 'status' in entry && entry.status === 'up';
}

@Public()
@SkipThrottle()
@Controller('v1')
export class HealthController {
  constructor(
    private readonly postgres: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /** Process is up (no DB/Redis). Matches `healthResponseSchema` in @app/shared. */
  @Get('health')
  healthCheck() {
    return { status: 'ok' as const };
  }

  @Get('ready')
  async readyCheck() {
    const [database, redis] = await Promise.all([
      this.postgres.isHealthy('database'),
      this.redis.isHealthy('redis'),
    ]);
    const info = { ...database, ...redis };
    if (!indicatorIsUp(database) || !indicatorIsUp(redis)) {
      throw new ServiceUnavailableException({ status: 'error', info });
    }
    return { status: 'ok' as const, info };
  }
}
