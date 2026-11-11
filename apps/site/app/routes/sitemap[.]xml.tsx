import { fetchPublicSitemap } from '../lib/api.server.js';
import { getSiteEnv } from '../lib/env.server.js';
import { buildSitemapXml } from '../lib/sitemap.js';

export async function loader() {
  const sitemap = await fetchPublicSitemap();
  const { PUBLIC_SITE_URL } = getSiteEnv();

  return new Response(buildSitemapXml(PUBLIC_SITE_URL, sitemap.items), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
