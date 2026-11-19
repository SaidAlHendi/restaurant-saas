import { fetchPublicSitemap } from '../lib/api.server.js';
import { getSiteEnv } from '../lib/env.server.js';
import { buildSitemapXml } from '../lib/sitemap.js';

export async function loader() {
  const { PUBLIC_SITE_URL } = getSiteEnv();
  // If the API is down the landing pages still go out, with a short cache so the menus come back soon.
  let menus: Awaited<ReturnType<typeof fetchPublicSitemap>>['items'] = [];
  let cacheControl = 'public, s-maxage=3600, stale-while-revalidate=600';
  try {
    menus = (await fetchPublicSitemap()).items;
  } catch {
    cacheControl = 'public, s-maxage=60';
  }

  return new Response(buildSitemapXml(PUBLIC_SITE_URL, menus), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  });
}
