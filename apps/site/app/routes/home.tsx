import { buildPageMeta } from '../lib/seo.js';

export function meta() {
  return buildPageMeta({
    title: 'Restaurant SaaS',
    description: 'Digital menus and operations for modern restaurants.',
    canonical: 'https://example.com/',
    locale: 'en',
  });
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">Restaurant SaaS</h1>
      <p className="mt-2 text-muted-foreground">
        Public marketing home (prerendered). Browse sample menu at{' '}
        <a className="text-primary underline" href="/en/m/al-bait">
          /en/m/al-bait
        </a>
        .
      </p>
    </main>
  );
}
