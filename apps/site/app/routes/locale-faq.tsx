import { FaqPage } from '../features/landing/components/InnerPages.js';
import { getLandingContent } from '../features/landing/content/index.js';
import { buildFaqJsonLd } from '../features/landing/landing-jsonld.server.js';
import { buildInnerPageMeta } from '../features/landing/landing.seo.js';
import { JsonLdScript } from '../features/landing/components/JsonLdScript.js';
import type { TrackingIds } from '../features/consent/tracking.js';
import { SITE_CONTACT_EMAIL } from '../lib/brand.js';
import { LANDING_CACHE_CONTROL, loadLandingRoute } from '../lib/landing-route.server.js';
import { isLandingLocale } from '../lib/locale.js';
import { serializeJsonLd } from '../lib/seo.js';

export function loader({ params }: { params: { locale?: string } }) {
  const { locale, siteBaseUrl, tracking } = loadLandingRoute(params);
  const jsonLd = serializeJsonLd(
    buildFaqJsonLd({
      locale,
      siteBaseUrl,
      content: getLandingContent(locale),
      contactEmail: SITE_CONTACT_EMAIL,
    }),
  );
  return { locale, siteBaseUrl, jsonLd, tracking };
}

export function headers() {
  return { 'Cache-Control': LANDING_CACHE_CONTROL };
}

export function meta({ data }: { data?: { locale: string; siteBaseUrl: string } }) {
  const locale = isLandingLocale(data?.locale) ? data.locale : 'ar';
  const content = getLandingContent(locale);
  return buildInnerPageMeta({
    ...content.pages.faq,
    locale,
    siteBaseUrl: data?.siteBaseUrl ?? 'http://localhost:5174',
    page: 'faq',
    ogAlt: content.hero.h1,
  });
}

export default function LocaleFaq({
  loaderData,
}: {
  loaderData: { locale: 'ar' | 'en'; jsonLd: string; tracking: TrackingIds };
}) {
  return (
    <>
      <FaqPage locale={loaderData.locale} tracking={loaderData.tracking} />
      <JsonLdScript json={loaderData.jsonLd} />
    </>
  );
}
