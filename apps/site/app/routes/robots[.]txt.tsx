import { getSiteEnv } from '../lib/env.server.js';

export function loader() {
  const { PUBLIC_SITE_URL } = getSiteEnv();
  const base = PUBLIC_SITE_URL.replace(/\/$/, '');
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
}
