import { Inject, Injectable, Logger } from '@nestjs/common';
import { Emitter } from '@socket.io/redis-emitter';
import type Redis from 'ioredis';

import { REDIS } from '../redis/redis.module';

import { REALTIME_NAMESPACE, branchRoom, userRoom } from './realtime-rooms';

/**
 * Sockets are only authorized at handshake. When access is taken away (member disabled,
 * branch scope changed, branch deactivated) we disconnect the affected sockets on every API
 * instance; clients reconnect and the handshake re-checks access.
 */
@Injectable()
export class RealtimeKickService {
  private readonly logger = new Logger(RealtimeKickService.name);
  private readonly emitter: Emitter;

  constructor(@Inject(REDIS) redis: Redis) {
    this.emitter = new Emitter(redis);
  }

  disconnectUser(userId: string): void {
    this.disconnect(userRoom(userId));
  }

  disconnectBranch(branchId: string): void {
    this.disconnect(branchRoom(branchId));
  }

  private disconnect(room: string): void {
    try {
      this.emitter.of(REALTIME_NAMESPACE).in(room).disconnectSockets(true);
    } catch (err: unknown) {
      // Best effort: the socket is also dropped when its access token expires.
      this.logger.warn({ err: err instanceof Error ? err.message : String(err), room }, 'realtime kick failed');
    }
  }
}
