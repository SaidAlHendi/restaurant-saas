import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { DbModule } from './core/db/db.module';
import { LoggingModule } from './core/logging/logging.module';
import { RedisModule } from './core/redis/redis.module';
import { AggregateSalesJob } from './jobs/aggregate-sales.job';
import { OutboxPublisherJob } from './jobs/outbox-publisher.job';
import { QueueModule } from './jobs/queue.module';

@Module({
  imports: [ConfigModule, LoggingModule, DbModule, RedisModule, QueueModule],
  providers: [OutboxPublisherJob, AggregateSalesJob],
})
export class WorkerModule {}
