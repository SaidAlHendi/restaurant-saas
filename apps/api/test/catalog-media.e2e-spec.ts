import { type INestApplication } from '@nestjs/common';

import { apiAgent } from './http';
import { createTestApp } from './create-test-app';

describe('Catalog media (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks path traversal', async () => {
    const agent = apiAgent(app);
    const res = await agent.get('/v1/media/../../../etc/passwd');
    expect([404, 400]).toContain(res.status);
  });
});
