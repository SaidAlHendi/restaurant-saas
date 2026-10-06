import { sampleMenu } from '../lib/sample-menu.js';
import { buildPageMeta, buildRestaurantJsonLd } from '../lib/seo.js';

type MenuLoaderData = {
  locale: 'ar' | 'en';
  orgSlug: string;
  restaurantName: string;
  items: { name: string; priceMinor: number; currency: string }[];
};

export function loader({ params }: { params: { locale?: string; orgSlug?: string } }) {
  const locale = params.locale;
  if (locale !== 'ar' && locale !== 'en') {
    throw new Response('Not Found', { status: 404 });
  }
  if (params.orgSlug !== sampleMenu.orgSlug) {
    throw new Response('Not Found', { status: 404 });
  }
  return {
    locale,
    orgSlug: params.orgSlug,
    restaurantName: sampleMenu.name[locale],
    items: sampleMenu.items.map((item) => ({
      name: item.name[locale],
      priceMinor: item.priceMinor,
      currency: item.currency,
    })),
  } satisfies MenuLoaderData;
}

export function meta({ data: loaderData }: { data?: MenuLoaderData }) {
  if (!loaderData) {
    return [{ title: 'Menu' }];
  }
  const canonical = `https://example.com/${loaderData.locale}/m/${loaderData.orgSlug}`;
  return buildPageMeta({
    title: `${loaderData.restaurantName} — Menu`,
    description: `Digital menu for ${loaderData.restaurantName}.`,
    canonical,
    locale: loaderData.locale,
  });
}

export default function LocaleMenu({ loaderData }: { loaderData: MenuLoaderData }) {
  const jsonLd = buildRestaurantJsonLd({
    name: loaderData.restaurantName,
    url: `https://example.com/${loaderData.locale}/m/${loaderData.orgSlug}`,
    locale: loaderData.locale,
    menuItems: loaderData.items,
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-semibold">{loaderData.restaurantName}</h1>
      <ul className="mt-6 space-y-3">
        {loaderData.items.map((item) => (
          <li key={item.name} className="flex items-center justify-between border-b border-border pb-2">
            <span>{item.name}</span>
            <span className="text-muted-foreground">
              {(item.priceMinor / 100).toFixed(2)} {item.currency}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
