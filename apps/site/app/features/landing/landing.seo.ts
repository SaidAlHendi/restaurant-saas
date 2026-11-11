import { type IndexedPageKey, type LandingLocale, LANDING_LOCALES } from '../../lib/locale.js';
import { buildPageMeta } from '../../lib/page-meta.js';
import type { LandingContent } from './content/types.js';
import { imageSrcSet } from './landing.utils.js';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * Preload only the hero display font (the wordmark), at low priority so it never competes with the
 * first-screen image for bandwidth. The body font loads from the stylesheet with `font-display: swap`.
 */
function fontPreloadTags(locale: LandingLocale) {
  const subset = locale === 'ar' ? 'arabic' : 'latin';
  return [
    {
      tagName: 'link',
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: `/fonts/lalezar-400-${subset}.woff2`,
      crossOrigin: 'anonymous',
      fetchPriority: 'low',
    },
  ];
}

/** The tablet photo is the largest element on the first screen: fetch it before the body is parsed. */
export const TABLET_IMAGE_SIZES = '(min-width: 768px) 58vw, 100vw';

function lcpImagePreload() {
  return {
    tagName: 'link',
    rel: 'preload',
    as: 'image',
    type: 'image/avif',
    imageSrcSet: imageSrcSet('tablet', 'avif'),
    imageSizes: TABLET_IMAGE_SIZES,
    fetchPriority: 'high',
  };
}

export function landingUrl(siteBaseUrl: string, locale: LandingLocale, page?: IndexedPageKey | 'thanks'): string {
  return new URL(page === undefined ? `/${locale}` : `/${locale}/${page}`, siteBaseUrl).toString();
}

export function ogImageUrl(siteBaseUrl: string, locale: LandingLocale): string {
  return new URL(`/landing/og-${locale}.jpg`, siteBaseUrl).toString();
}

/** Title, description, canonical, hreflang (ar, en, x-default), Open Graph and Twitter tags. */
export function buildLandingMeta(input: {
  locale: LandingLocale;
  siteBaseUrl: string;
  meta: LandingContent['meta'];
  ogAlt: string;
}) {
  const { locale, siteBaseUrl, meta, ogAlt } = input;
  const canonical = landingUrl(siteBaseUrl, locale);
  const image = ogImageUrl(siteBaseUrl, locale);
  return [
    ...buildPageMeta({
      title: meta.title,
      description: meta.description,
      canonical,
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      imageUrl: image,
      alternateLocales: [
        ...LANDING_LOCALES.map((l) => ({ locale: l, href: landingUrl(siteBaseUrl, l) })),
        { locale: 'x-default', href: landingUrl(siteBaseUrl, 'ar') },
      ],
    }),
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { property: 'og:site_name', content: locale === 'ar' ? 'صحتين' : 'Sahtain' },
    { property: 'og:image:width', content: String(OG_IMAGE_SIZE.width) },
    { property: 'og:image:height', content: String(OG_IMAGE_SIZE.height) },
    { property: 'og:image:alt', content: ogAlt },
    { name: 'twitter:image', content: image },
    { name: 'twitter:image:alt', content: ogAlt },
    { name: 'theme-color', content: '#f3ecdf' },
    ...fontPreloadTags(locale),
    lcpImagePreload(),
  ];
}

/** Pages that must stay out of search results (the conversion page). */
export function buildNoindexMeta(input: {
  title: string;
  description: string;
  locale: LandingLocale;
}) {
  return [
    { title: input.title },
    { name: 'description', content: input.description },
    { name: 'robots', content: 'noindex, nofollow' },
    ...fontPreloadTags(input.locale),
  ];
}

/** An indexable inner page (plans, FAQ, contact, privacy, terms): own canonical, ar/en alternates, share image. */
export function buildInnerPageMeta(input: {
  title: string;
  description: string;
  locale: LandingLocale;
  siteBaseUrl: string;
  page: IndexedPageKey;
  ogAlt: string;
}) {
  const { title, description, locale, siteBaseUrl, page, ogAlt } = input;
  const image = ogImageUrl(siteBaseUrl, locale);
  return [
    ...buildPageMeta({
      title,
      description,
      canonical: landingUrl(siteBaseUrl, locale, page),
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      imageUrl: image,
      alternateLocales: [
        ...LANDING_LOCALES.map((l) => ({ locale: l, href: landingUrl(siteBaseUrl, l, page) })),
        { locale: 'x-default', href: landingUrl(siteBaseUrl, 'ar', page) },
      ],
    }),
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: landingUrl(siteBaseUrl, locale, page) },
    { property: 'og:site_name', content: locale === 'ar' ? 'صحتين' : 'Sahtain' },
    { property: 'og:image:width', content: String(OG_IMAGE_SIZE.width) },
    { property: 'og:image:height', content: String(OG_IMAGE_SIZE.height) },
    { property: 'og:image:alt', content: ogAlt },
    { name: 'twitter:image', content: image },
    { name: 'theme-color', content: '#f3ecdf' },
    ...fontPreloadTags(locale),
  ];
}
