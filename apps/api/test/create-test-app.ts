import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';

export async function createTestApp(): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  resetEnvCacheForTests();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.init();
  return { app, moduleRef };
}
