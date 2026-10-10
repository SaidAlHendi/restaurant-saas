import { Module } from '@nestjs/common';

import { WorkerDbModule } from '../db/worker-db.module';
import { RedisModule } from '../redis/redis.module';

import { EVENT_PUBLISHER } from './event-publisher';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxRepository } from './outbox.repository';
import { SocketIoRedisEventPublisher } from './socket-io-redis-event.publisher';

@Module({
  imports: [WorkerDbModule, RedisModule],
  providers: [
    OutboxRepository,
    OutboxPublisherService,
    { provide: EVENT_PUBLISHER, useClass: SocketIoRedisEventPublisher },
  ],
  exports: [OutboxPublisherService, OutboxRepository, WorkerDbModule, EVENT_PUBLISHER],
})
export class OutboxPublisherModule {}
