import { parseTrackingIds, type TrackingIds } from '../features/consent/tracking.js';
import { getSiteEnv } from './env.server.js';
import { isLandingLocale, type LandingLocale } from './locale.js';

/** Shared loader for `/:locale/*` pages: 404 for unknown locales, plus the public site URL. */
export function loadLandingRoute(params: { locale?: string }): {
  locale: LandingLocale;
  siteBaseUrl: string;
  tracking: TrackingIds;
} {
  const locale = params.locale;
  if (!isLandingLocale(locale)) {
    throw new Response('Not Found', { status: 404 });
  }
  const env = getSiteEnv();
  return {
    locale,
    siteBaseUrl: env.PUBLIC_SITE_URL,
    tracking: parseTrackingIds({
      ga4: env.PUBLIC_GA4_ID,
      metaPixel: env.PUBLIC_META_PIXEL_ID,
      googleAds: env.PUBLIC_GOOGLE_ADS_ID,
    }),
  };
}

/** Static marketing pages are cached at the CDN and revalidated in the background. */
export const LANDING_CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600';
