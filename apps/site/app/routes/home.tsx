import { SITE_APP_TITLE } from '../lib/brand.js';
import { getSiteEnv } from '../lib/env.server.js';
import { homeCanonicalUrl } from '../lib/menu-path.js';
import { buildPageMeta } from '../lib/seo.js';

export function loader() {
  return { siteBaseUrl: getSiteEnv().PUBLIC_SITE_URL };
}

export function meta({ data: loaderData }: { data?: { siteBaseUrl: string } }) {
  return buildPageMeta({
    title: SITE_APP_TITLE.en,
    description: 'Digital menus and operations for modern restaurants.',
    canonical: loaderData && homeCanonicalUrl(loaderData.siteBaseUrl),
    locale: 'en',
  });
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">{SITE_APP_TITLE.en}</h1>
      <p className="mt-2 text-muted-foreground">
        Public marketing home (prerendered). Browse sample menu at{' '}
        <a className="text-primary underline" href="/en/m/demo">
          /en/m/demo
        </a>
        .
      </p>
    </main>
  );
}
