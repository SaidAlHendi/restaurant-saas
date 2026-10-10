import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { OutboxPublisherModule } from './core/outbox/outbox-publisher.module';
import { LoggingModule } from './core/logging/logging.module';
import { AggregateSalesJob } from './jobs/aggregate-sales.job';
import { OutboxPublisherJob } from './jobs/outbox-publisher.job';
import { QueueModule } from './jobs/queue.module';

@Module({
  imports: [ConfigModule, LoggingModule, OutboxPublisherModule, QueueModule],
  providers: [OutboxPublisherJob, AggregateSalesJob],
})
export class WorkerModule {}
