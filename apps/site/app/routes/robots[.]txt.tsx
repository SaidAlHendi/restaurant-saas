import { getSiteEnv } from '../lib/env.server.js';
import { buildRobotsTxt } from '../lib/sitemap.js';

export function loader() {
  const { PUBLIC_SITE_URL } = getSiteEnv();
  return new Response(buildRobotsTxt(PUBLIC_SITE_URL), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
}
