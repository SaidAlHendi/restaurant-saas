import { currencyDigits, type PublicMenuPayload } from '@app/shared';

export type PageMetaInput = {
  title: string;
  description: string;
  canonical: string;
  locale: string;
  imageUrl?: string;
  alternateLocales?: Array<{ locale: string; href: string }>;
};

export function minorUnitsToMajorString(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  const major = minor / 10 ** digits;
  return major.toFixed(digits);
}

export function buildPageMeta(input: PageMetaInput) {
  const tags: Array<Record<string, string>> = [
    { title: input.title },
    { name: 'description', content: input.description },
    { tagName: 'link', rel: 'canonical', href: input.canonical },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:locale', content: input.locale },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: input.title },
    { name: 'twitter:description', content: input.description },
  ];
  if (input.imageUrl) {
    tags.push({ property: 'og:image', content: input.imageUrl });
  }
  if (input.alternateLocales) {
    for (const alt of input.alternateLocales) {
      tags.push({
        tagName: 'link',
        rel: 'alternate',
        hrefLang: alt.locale,
        href: alt.href,
      });
    }
  }
  return tags;
}

export function buildMenuPageMeta(input: {
  menu: PublicMenuPayload;
  locale: 'ar' | 'en';
  canonical: string;
  siteBaseUrl: string;
  orgSlug: string;
  branchSlug?: string;
}) {
  const { menu, locale, canonical, siteBaseUrl, orgSlug, branchSlug } = input;
  const title = `${menu.org.name} — ${locale === 'ar' ? 'القائمة' : 'Menu'}`;
  const description =
    locale === 'ar'
      ? `قائمة ${menu.org.name} — اطلع على الأصناف والأسعار.`
      : `Digital menu for ${menu.org.name}. Browse items and prices.`;

  const firstProductImage = menu.categories
    .flatMap((c) => c.products)
    .map((p) => p.imageUrls?.url800)
    .find((url) => url !== undefined);

  const imageUrl = menu.org.logoUrl ?? firstProductImage;

  const alternateLocales = menu.org.locales.map((loc) => ({
    locale: loc,
    href: new URL(
      branchSlug === undefined ? `/${loc}/m/${orgSlug}` : `/${loc}/m/${orgSlug}/${branchSlug}`,
      siteBaseUrl,
    ).toString(),
  }));

  return buildPageMeta({
    title,
    description,
    canonical,
    locale,
    imageUrl,
    alternateLocales,
  });
}

export function buildMenuJsonLd(input: {
  menu: PublicMenuPayload;
  locale: 'ar' | 'en';
  url: string;
}) {
  const { menu, locale, url } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: menu.org.name,
    url,
    inLanguage: locale,
    hasMenu: {
      '@type': 'Menu',
      hasMenuSection: input.menu.categories.map((section) => ({
        '@type': 'MenuSection',
        name: section.name,
        hasMenuItem: section.products.map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.description ?? undefined,
          offers: {
            '@type': 'Offer',
            price: minorUnitsToMajorString(item.priceMinor, item.currency),
            priceCurrency: item.currency,
          },
        })),
      })),
    },
  };
}
