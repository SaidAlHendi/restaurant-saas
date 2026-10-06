import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { PostgresHealthIndicator, RedisHealthIndicator } from './health.indicators';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PostgresHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
