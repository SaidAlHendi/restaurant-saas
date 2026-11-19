import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.server.js', () => ({ fetchPublicSitemap: vi.fn() }));
vi.mock('../lib/env.server.js', () => ({
  getSiteEnv: () => ({ PUBLIC_SITE_URL: 'https://getsahtain.com' }),
}));

import { fetchPublicSitemap } from '../lib/api.server.js';
import { loader } from './sitemap[.]xml.js';

afterEach(() => {
  vi.mocked(fetchPublicSitemap).mockReset();
});

describe('sitemap.xml loader', () => {
  it('lists menus and caches for an hour when the API answers', async () => {
    vi.mocked(fetchPublicSitemap).mockResolvedValue({
      items: [{ slug: 'al-bait', locales: ['ar'] }],
    } as never);
    const res = await loader();
    expect(await res.text()).toContain('/ar/m/al-bait');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600');
  });

  it('still serves the landing pages, with a short cache, when the API is down', async () => {
    vi.mocked(fetchPublicSitemap).mockRejectedValue(new Response('Upstream error', { status: 502 }));
    const res = await loader();
    const xml = await res.text();
    expect(res.status).toBe(200);
    expect(xml).toContain('<loc>https://getsahtain.com/ar/plans</loc>');
    expect(xml).not.toContain('/m/');
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60');
  });
});
