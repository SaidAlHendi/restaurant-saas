import { describe, expect, it, vi, beforeEach } from 'vitest';

import { publicMenuPayloadSchema } from '@app/shared';

import { resetSiteEnvCacheForTests } from './env.server.js';
import { loadPublicMenuPage } from './public-menu-loader.server.js';

const menuPayload = publicMenuPayloadSchema.parse({
  org: {
    name: 'Demo',
    slug: 'demo',
    defaultLocale: 'en',
    locales: ['en'],
    currency: 'SAR',
    logoUrl: null,
  },
  branches: [],
  categories: [],
  effectiveLocale: 'en',
});

describe('loadPublicMenuPage', () => {
  beforeEach(() => {
    resetSiteEnvCacheForTests();
    vi.stubEnv('PUBLIC_API_URL', 'http://api.test');
    vi.stubEnv('PUBLIC_SITE_URL', 'http://site.test');
  });

  it('throws 404 for invalid locale segment', async () => {
    await expect(
      loadPublicMenuPage({
        locale: 'fr',
        orgSlug: 'demo',
        requestUrl: 'http://site.test/en/m/demo',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('maps upstream 404 to Response 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 404 })),
    );
    await expect(
      loadPublicMenuPage({
        locale: 'en',
        orgSlug: 'missing',
        requestUrl: 'http://site.test/en/m/missing',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('maps upstream 410 to Response 410', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('gone', { status: 410 })),
    );
    await expect(
      loadPublicMenuPage({
        locale: 'en',
        orgSlug: 'demo',
        requestUrl: 'http://site.test/en/m/demo',
      }),
    ).rejects.toMatchObject({ status: 410 });
  });

  it('redirects when locale is not enabled for org', async () => {
    const menuArOnly = publicMenuPayloadSchema.parse({
      ...menuPayload,
      org: { ...menuPayload.org, locales: ['ar'], defaultLocale: 'ar' },
      effectiveLocale: 'ar',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(menuArOnly), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    await expect(
      loadPublicMenuPage({
        locale: 'en',
        orgSlug: 'demo',
        requestUrl: 'http://site.test/en/m/demo',
      }),
    ).rejects.toMatchObject({ status: 302 });
  });
});
