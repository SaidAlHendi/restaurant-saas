import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { PostgresHealthIndicator, RedisHealthIndicator } from './health.indicators';

@Controller('v1')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly postgres: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  healthCheck() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  readyCheck() {
    return this.health.check([
      () => this.postgres.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
