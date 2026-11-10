import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeadCreateBody } from '@app/shared';

import { resetSiteEnvCacheForTests } from './env.server.js';
import { submitLead } from './leads.server.js';

const body: LeadCreateBody = {
  name: 'Sara',
  restaurantName: 'Qahwa',
  phone: '0501234567',
  email: 'sara@example.com',
  country: 'SA',
  branches: 1,
  locale: 'ar',
};

beforeEach(() => {
  process.env['PUBLIC_API_URL'] = 'https://api.example.com';
  process.env['PUBLIC_SITE_URL'] = 'https://getsahtain.com';
  resetSiteEnvCacheForTests();
});

describe('submitLead', () => {
  it('posts the lead as JSON to the public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 201 }));
    expect(await submitLead(body, fetchMock)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.example.com/v1/public/leads');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ email: 'sara@example.com', branches: 1 });
  });

  it('reports rate limiting and other API failures', async () => {
    const limited = vi.fn().mockResolvedValue(new Response('', { status: 429 }));
    const broken = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    expect(await submitLead(body, limited)).toEqual({ ok: false, kind: 'rate_limited' });
    expect(await submitLead(body, broken)).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('turns a network error into an unavailable result instead of throwing', async () => {
    const down = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await submitLead(body, down)).toEqual({ ok: false, kind: 'unavailable' });
  });
});
