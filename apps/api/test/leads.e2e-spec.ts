import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import type { Agent } from 'supertest';

import { loadEnv } from '../src/config/env';

import { createTestApp } from './create-test-app';
import { apiAgent } from './http';

type LeadRow = {
  name: string;
  restaurant_name: string;
  phone: string;
  email: string;
  country: string;
  branches: number;
  locale: string;
  message: string | null;
  utm_source: string | null;
  gclid: string | null;
  landing_path: string | null;
  status: string;
};

describe('Public leads API (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  /** The API role can only INSERT leads; reading them back needs the owner connection. */
  let ownerPool: pg.Pool;
  const tag = `e2e-${String(Date.now())}`;

  const body = (suffix: string, extra: Record<string, unknown> = {}) => ({
    name: 'Sara Al-Qahtani',
    restaurantName: `Qahwa ${tag} ${suffix}`,
    phone: '+966 50 123 4567',
    email: `sara+${tag}-${suffix}@example.com`,
    country: 'SA',
    branches: 2,
    locale: 'ar',
    ...extra,
  });

  const findLeads = async (suffix: string): Promise<LeadRow[]> => {
    const result = await ownerPool.query<LeadRow>(
      'SELECT * FROM leads WHERE restaurant_name = $1',
      [`Qahwa ${tag} ${suffix}`],
    );
    return result.rows;
  };

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    ownerPool = new pg.Pool({ connectionString: loadEnv().DATABASE_MIGRATION_URL });
  });

  afterAll(async () => {
    await ownerPool.query('DELETE FROM leads WHERE restaurant_name LIKE $1', [`Qahwa ${tag}%`]);
    await ownerPool.end();
    await app.close();
  });

  it('stores a valid lead without any login and never caches the answer', async () => {
    const res = await agent.post('/v1/public/leads').send(
      body('ok', {
        message: 'Two branches in Riyadh',
        attribution: { utm_source: 'google', gclid: 'abc123', landingPath: '/ar' },
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['cache-control']).toBe('no-store');

    const rows = await findLeads('ok');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      country: 'SA',
      branches: 2,
      locale: 'ar',
      status: 'new',
      message: 'Two branches in Riyadh',
      utm_source: 'google',
      gclid: 'abc123',
      landing_path: '/ar',
    });
  });

  it('normalizes email and Arabic-Indic digits in the phone number', async () => {
    const res = await agent
      .post('/v1/public/leads')
      .send(body('norm', { email: `SARA+${tag}-norm@Example.COM`, phone: '٠٥٠ ١٢٣ ٤٥٦٧', country: 'sa' }));
    expect(res.status).toBe(201);
    const [row] = await findLeads('norm');
    expect(row?.phone).toBe('050 123 4567');
    expect(row?.email).toBe(`sara+${tag}-norm@example.com`);
    expect(row?.country).toBe('SA');
  });

  it('answers a bot that fills the honeypot like a success but stores nothing', async () => {
    const res = await agent.post('/v1/public/leads').send(body('bot', { website: 'http://spam.example' }));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(await findLeads('bot')).toHaveLength(0);
  });

  it.each([
    ['missing name', { name: '' }],
    ['bad email', { email: 'nope' }],
    ['bad phone', { phone: 'call me' }],
    ['bad country', { country: 'SAU' }],
    ['zero branches', { branches: 0 }],
    ['unknown locale', { locale: 'fr' }],
  ])('rejects %s with 400 and stores nothing', async (label, patch) => {
    const suffix = `bad-${label.replace(/\s/g, '-')}`;
    const res = await agent.post('/v1/public/leads').send(body(suffix, patch));
    expect(res.status).toBe(400);
    expect(await findLeads(suffix)).toHaveLength(0);
  });

  it('does not let the API role read leads back', async () => {
    // Defense in depth: even a compromised request handler cannot list the leads table.
    const appRole = new pg.Pool({ connectionString: loadEnv().DATABASE_URL });
    try {
      await expect(appRole.query('SELECT 1 FROM leads LIMIT 1')).rejects.toThrow(/permission denied/i);
    } finally {
      await appRole.end();
    }
  });
});
