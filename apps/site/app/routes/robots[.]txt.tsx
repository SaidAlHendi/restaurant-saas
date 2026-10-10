import { data } from 'react-router';

import { getSiteEnv } from '../lib/env.server.js';

export function loader() {
  const { PUBLIC_SITE_URL } = getSiteEnv();
  const base = PUBLIC_SITE_URL.replace(/\/$/, '');
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  return data(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
}

export default function RobotsTxt({ loaderData }: { loaderData: string }) {
  return <pre className="p-4 text-sm">{loaderData}</pre>;
}
