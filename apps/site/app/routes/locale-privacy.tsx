import type { TrackingIds } from '../features/consent/tracking.js';
import { DocumentPage } from '../features/landing/components/DocumentPage.js';
import { getLegalContent } from '../features/landing/content/index.js';
import { buildInnerPageMeta } from '../features/landing/landing.seo.js';
import { LANDING_CACHE_CONTROL, loadLandingRoute } from '../lib/landing-route.server.js';
import { isLandingLocale } from '../lib/locale.js';

export function loader({ params }: { params: { locale?: string } }) {
  return loadLandingRoute(params);
}

export function headers() {
  return { 'Cache-Control': LANDING_CACHE_CONTROL };
}

export function meta({ data }: { data?: { locale: string; siteBaseUrl: string } }) {
  const locale = isLandingLocale(data?.locale) ? data.locale : 'ar';
  const { privacy } = getLegalContent(locale);
  return buildInnerPageMeta({
    title: privacy.title,
    description: privacy.description,
    locale,
    siteBaseUrl: data?.siteBaseUrl ?? 'http://localhost:5174',
    page: 'privacy',
    ogAlt: privacy.title,
  });
}

export default function LocalePrivacy({
  loaderData,
}: {
  loaderData: { locale: 'ar' | 'en'; tracking: TrackingIds };
}) {
  return <DocumentPage locale={loaderData.locale} kind="privacy" tracking={loaderData.tracking} />;
}
