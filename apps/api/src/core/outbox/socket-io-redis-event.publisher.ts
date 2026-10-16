import { Inject, Injectable } from '@nestjs/common';
import { Emitter } from '@socket.io/redis-emitter';
import type Redis from 'ioredis';

import { REALTIME_NAMESPACE, branchRoom } from '../realtime/realtime-rooms';
import { REDIS } from '../redis/redis.module';

import type { EventPublisher, OutboxEventRow } from './event-publisher';

/**
 * Publishes via Socket.io Redis emitter. Uses the default Redis key prefix `socket.io`
 * (same as @socket.io/redis-adapter) so API gateway instances receive broadcasts.
 */
@Injectable()
export class SocketIoRedisEventPublisher implements EventPublisher {
  private readonly emitter: Emitter;

  constructor(@Inject(REDIS) redis: Redis) {
    this.emitter = new Emitter(redis);
  }

  publish(event: OutboxEventRow): Promise<void> {
    if (!event.branchId) {
      return Promise.reject(new Error('Outbox event is missing branchId'));
    }
    const room = branchRoom(event.branchId);
    const ns = this.emitter.of(REALTIME_NAMESPACE);
    ns.to(room).emit(event.type, event.payload);
    return Promise.resolve();
  }
}
