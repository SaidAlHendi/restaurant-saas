import type { TrackingIds } from '../features/consent/tracking.js';
import { JsonLdScript } from '../features/landing/components/JsonLdScript.js';
import { LandingPage } from '../features/landing/components/LandingPage.js';
import { getLandingContent } from '../features/landing/content/index.js';
import { buildLandingJsonLd } from '../features/landing/landing-jsonld.server.js';
import { buildLandingMeta } from '../features/landing/landing.seo.js';
import { LANDING_CACHE_CONTROL, loadLandingRoute } from '../lib/landing-route.server.js';
import { SITE_CONTACT_EMAIL } from '../lib/brand.js';
import { isLandingLocale } from '../lib/locale.js';
import { serializeJsonLd } from '../lib/seo.js';

export function loader({ params }: { params: { locale?: string } }) {
  const { locale, siteBaseUrl, tracking } = loadLandingRoute(params);
  const jsonLd = serializeJsonLd(
    buildLandingJsonLd({
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
  return buildLandingMeta({
    locale,
    siteBaseUrl: data?.siteBaseUrl ?? 'http://localhost:5174',
    meta: content.meta,
    ogAlt: content.hero.h1,
  });
}

export default function LocaleHome({
  loaderData,
}: {
  loaderData: { locale: 'ar' | 'en'; jsonLd: string; tracking: TrackingIds };
}) {
  return (
    <>
      <LandingPage locale={loaderData.locale} tracking={loaderData.tracking} />
      <JsonLdScript json={loaderData.jsonLd} />
    </>
  );
}
