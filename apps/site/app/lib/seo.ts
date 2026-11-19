import {
  convertMinorToDisplay,
  currencyDigits,
  isDisplayConversionActive,
  type MoneyDisplay,
  type PublicMenuPayload,
} from '@app/shared';

import { buildPageMeta } from './page-meta.js';

export { buildPageMeta, type PageMetaInput } from './page-meta.js';

export function minorUnitsToMajorString(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  const major = minor / 10 ** digits;
  return major.toFixed(digits);
}

/** Price and currency as guests see them: converted when the menu has a display currency. */
function shownOffer(
  priceMinor: number,
  currency: string,
  display: MoneyDisplay | null,
): { price: string; priceCurrency: string } {
  if (!isDisplayConversionActive(currency, display)) {
    return { price: minorUnitsToMajorString(priceMinor, currency), priceCurrency: currency };
  }
  return {
    price: minorUnitsToMajorString(
      convertMinorToDisplay(priceMinor, currency, display, 'item'),
      display.currency,
    ),
    priceCurrency: display.currency,
  };
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

/** Safe for embedding in `<script type="application/ld+json">` (prevents `</script>` breakout). */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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
            ...shownOffer(item.priceMinor, item.currency, menu.org.display),
          },
        })),
      })),
    },
  };
}
