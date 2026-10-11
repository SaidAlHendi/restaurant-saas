import type { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

import { loadEnv } from '../../config/env';

/** Same `Server` type Nest passes to {@link IoAdapter.close}. */
type IoServer = Parameters<IoAdapter['close']>[0];

function corsOriginsFromEnv(): string[] | boolean {
  const env = loadEnv();
  const raw = env.CORS_ORIGINS;
  if (!raw || raw.length === 0) {
    return true;
  }
  return raw.split(',').map((s) => s.trim());
}

function socketIoCorsOptions(allowed: string[] | boolean): ServerOptions['cors'] {
  if (allowed === true) {
    return { origin: true, credentials: true };
  }
  return {
    credentials: true,
    origin: (origin, callback) => {
      if (origin === undefined) {
        callback(null, true);
        return;
      }
      if (!allowed.includes(origin)) {
        callback(new Error('Origin not allowed by CORS'));
        return;
      }
      callback(null, true);
    },
  };
}

function isSocketIoServer(value: unknown): value is IoServer {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return typeof Reflect.get(value, 'adapter') === 'function';
}

function asSocketIoServer(value: unknown): IoServer {
  if (!isSocketIoServer(value)) {
    throw new Error('Expected Socket.io Server instance');
  }
  return value;
}

export class SocketIoRedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private pubClient: Redis | undefined;
  private subClient: Redis | undefined;
  private readonly corsOrigin: string[] | boolean;
  private readonly servers = new Set<IoServer>();

  constructor(app: INestApplication) {
    super(app);
    this.corsOrigin = corsOriginsFromEnv();
  }

  connectToRedis(): void {
    const env = loadEnv();
    this.pubClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.subClient = this.pubClient.duplicate();
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  createIOServer(port: number, options?: ServerOptions): IoServer {
    const created: unknown = super.createIOServer(port, {
      ...options,
      cors: socketIoCorsOptions(this.corsOrigin),
    });
    const server = asSocketIoServer(created);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    this.servers.add(server);
    return server;
  }

  async close(server: IoServer): Promise<void> {
    await super.close(server);
    this.servers.delete(server);
    if (this.servers.size === 0) {
      await this.quitRedisClients();
    }
  }

  private async quitRedisClients(): Promise<void> {
    await Promise.all([
      this.pubClient?.quit().catch(() => undefined),
      this.subClient?.quit().catch(() => undefined),
    ]);
    this.pubClient = undefined;
    this.subClient = undefined;
  }
}
