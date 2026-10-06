import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /v1/ready', async () => {
    const res = await request(app.getHttpServer()).get('/v1/ready').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('info');
  });
});
