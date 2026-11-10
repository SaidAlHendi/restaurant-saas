import type { TrackingIds } from '../features/consent/tracking.js';
import { ThanksPage } from '../features/landing/components/ThanksPage.js';
import { getThanksContent } from '../features/landing/content/index.js';
import { buildNoindexMeta } from '../features/landing/landing.seo.js';
import { loadLandingRoute } from '../lib/landing-route.server.js';
import { isLandingLocale } from '../lib/locale.js';

export function loader({ params }: { params: { locale?: string } }) {
  return loadLandingRoute(params);
}

export function headers() {
  return { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
}

export function meta({ data }: { data?: { locale: string } }) {
  const locale = isLandingLocale(data?.locale) ? data.locale : 'ar';
  const content = getThanksContent(locale);
  return buildNoindexMeta({ title: content.title, description: content.description, locale });
}

export default function LocaleThanks({
  loaderData,
}: {
  loaderData: { locale: 'ar' | 'en'; tracking: TrackingIds };
}) {
  return <ThanksPage locale={loaderData.locale} tracking={loaderData.tracking} />;
}
