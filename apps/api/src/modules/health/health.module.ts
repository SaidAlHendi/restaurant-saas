import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { PostgresHealthIndicator, RedisHealthIndicator } from './health.indicators';

@Module({
  controllers: [HealthController],
  providers: [PostgresHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
