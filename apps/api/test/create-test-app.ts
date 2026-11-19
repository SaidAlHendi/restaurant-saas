import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { AppModule } from '../src/app.module';
import { CLOCK, type Clock } from '../src/core/clock/clock.tokens';
import { loadEnv, resetEnvCacheForTests } from '../src/config/env';
import { SocketIoRedisIoAdapter } from '../src/core/realtime/socket-io-redis.adapter';

export type TestAppContext = {
  app: INestApplication;
  moduleRef: TestingModule;
  redisAdapter: SocketIoRedisIoAdapter;
};

export async function createTestApp(
  envOverrides?: Record<string, string | undefined>,
  clock?: Clock,
): Promise<TestAppContext> {
  resetEnvCacheForTests();
  if (envOverrides !== undefined) {
    loadEnv(envOverrides);
  }
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (clock === undefined
    ? builder
    : builder.overrideProvider(CLOCK).useValue(clock)
  ).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  const env = loadEnv(envOverrides);
  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGINS?.split(',').map((s) => s.trim()) ?? true,
    credentials: true,
  });
  app.enableShutdownHooks();
  const redisAdapter = new SocketIoRedisIoAdapter(app);
  redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);
  await app.init();
  return { app, moduleRef, redisAdapter };
}
