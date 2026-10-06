import { Inject, Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import type pg from 'pg';

import { PG_POOL } from '../../core/db/db.module';
import { REDIS } from '../../core/redis/redis.module';

function indicatorStatus(
  key: string,
  isHealthy: boolean,
  details?: Record<string, unknown>,
): HealthIndicatorResult {
  return {
    [key]: {
      status: isHealthy ? 'up' : 'down',
      ...details,
    },
  };
}

@Injectable()
export class PostgresHealthIndicator {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.pool.query('SELECT 1');
      return indicatorStatus(key, true);
    } catch (error) {
      return indicatorStatus(key, false, { message: String(error) });
    }
  }
}

@Injectable()
export class RedisHealthIndicator {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return indicatorStatus(key, true);
    } catch (error) {
      return indicatorStatus(key, false, { message: String(error) });
    }
  }
}
