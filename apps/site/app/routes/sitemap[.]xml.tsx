import { fetchPublicSitemap } from '../lib/api.server.js';
import { getSiteEnv } from '../lib/env.server.js';

export async function loader() {
  const sitemap = await fetchPublicSitemap();
  const { PUBLIC_SITE_URL } = getSiteEnv();
  const base = PUBLIC_SITE_URL.replace(/\/$/, '');

  const urls: string[] = [];
  for (const entry of sitemap.items) {
    for (const locale of entry.locales) {
      urls.push(`${base}/${locale}/m/${entry.slug}`);
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `  <url>
    <loc>${loc}</loc>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
