import type { Server } from 'node:http';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';

import { ConfigModule } from '../src/config/config.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DbModule } from '../src/core/db/db.module';
import { OutboxPublisherModule } from '../src/core/outbox/outbox-publisher.module';
import { OutboxPublisherService } from '../src/core/outbox/outbox-publisher.service';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { loginSeedUser } from './factories';
import { apiAgent } from './http';
import { postOrder, seedCatalogProduct } from './ordering-helpers';

function listenPort(app: INestApplication): number {
  const addr = (app.getHttpServer() as Server).address();
  if (addr !== null && typeof addr === 'object' && 'port' in addr && typeof addr.port === 'number') {
    return addr.port;
  }
  throw new Error('expected bound server');
}

async function connectSocket(
  port: number,
  auth: { token?: string; branchId: string },
  extraHeaders?: Record<string, string>,
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${String(port)}/rt`, {
      transports: ['websocket'],
      auth,
      extraHeaders,
      reconnection: false,
      timeout: 5_000,
    });
    socket.on('connect', () => {
      resolve(socket);
    });
    socket.on('connect_error', (err: Error) => {
      reject(err);
    });
  });
}

describe('Realtime gateway (e2e)', () => {
  let app: INestApplication;
  let publisherModule: TestingModule;
  let publisher: OutboxPublisherService;
  let port = 0;
  let branchId = '';
  let productId = '';

  beforeAll(async () => {
    ({ app } = await createTestApp());
    await app.listen(0);
    port = listenPort(app);

    publisherModule = await Test.createTestingModule({
      imports: [ConfigModule, DbModule, OutboxPublisherModule],
    }).compile();
    publisher = publisherModule.get(OutboxPublisherService);

    const owner = await asDemoOwner(apiAgent(app));
    const me = await owner.get('/v1/me');
    branchId = (me.body as { branches: Array<{ id: string }> }).branches[0]?.id ?? '';
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
  });

  afterAll(async () => {
    await app.close();
    await publisherModule.close();
  });

  it('rejects missing token with UNAUTHORIZED', async () => {
    await expect(
      connectSocket(port, { branchId }),
    ).rejects.toMatchObject({ message: 'UNAUTHORIZED' });
  });

  it('rejects branch outside membership with FORBIDDEN', async () => {
    const agent = apiAgent(app);
    const { accessToken } = await loginSeedUser(agent, 'kitchen', 'demo');
    const otherBranch = newUuidV7();
    await expect(
      connectSocket(port, { token: accessToken, branchId: otherBranch }),
    ).rejects.toMatchObject({ message: 'FORBIDDEN' });
  });

  it('delivers an outbox event through Redis adapter', async () => {
    const agent = apiAgent(app);
    const { accessToken } = await loginSeedUser(agent, 'kitchen', 'demo');
    const socket = await connectSocket(port, { token: accessToken, branchId });

    const eventPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('timed out waiting for order.placed'));
      }, 10_000);
      socket.on('order.placed', (payload: Record<string, unknown>) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

    const owner = await asDemoOwner(agent);
    const clientOrderId = newUuidV7();
    const created = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(created.status).toBe(201);

    await publisher.publishNextBatch(10);

    const payload = await eventPromise;
    expect(payload['orderId']).toBe((created.body as { id: string }).id);
    expect(payload['change']).toBe('placed');
    socket.disconnect();
  });
});

describe('Realtime gateway CORS (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
    resetEnvCacheForTests();
  });

  it('refuses handshake when Origin is not allowed', async () => {
    resetEnvCacheForTests();
    ({ app } = await createTestApp({ CORS_ORIGINS: 'http://localhost:5173' }));
    await app.listen(0);
    const port = listenPort(app);
    const agent = apiAgent(app);
    const { accessToken } = await loginSeedUser(agent, 'kitchen', 'demo');
    const me = await agent.get('/v1/me').set('Authorization', `Bearer ${accessToken}`);
    const branchId = (me.body as { branches: Array<{ id: string }> }).branches[0]?.id ?? '';

    await expect(
      connectSocket(
        port,
        { token: accessToken, branchId },
        { Origin: 'http://evil.example' },
      ),
    ).rejects.toThrow();
  });
});
