import { data } from 'react-router';

import type { TrackingIds } from '../features/consent/tracking.js';
import { ThanksPage } from '../features/landing/components/ThanksPage.js';
import { getThanksContent } from '../features/landing/content/index.js';
import { buildNoindexMeta } from '../features/landing/landing.seo.js';
import { clearLeadSubmittedCookie, hasLeadSubmittedCookie } from '../lib/lead-cookie.server.js';
import { loadLandingRoute } from '../lib/landing-route.server.js';
import { isLandingLocale } from '../lib/locale.js';

/** `leadSubmitted` is true only right after a real form submit; the cookie is used up by this visit. */
export function loader({ request, params }: { request: Request; params: { locale?: string } }) {
  const route = loadLandingRoute(params);
  const leadSubmitted = hasLeadSubmittedCookie(request);
  return data(
    { ...route, leadSubmitted },
    leadSubmitted ? { headers: { 'Set-Cookie': clearLeadSubmittedCookie() } } : undefined,
  );
}

export function headers({ loaderHeaders }: { loaderHeaders: Headers }) {
  const result = new Headers({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  const cookie = loaderHeaders.get('Set-Cookie');
  if (cookie) {
    result.set('Set-Cookie', cookie);
  }
  return result;
}

export function meta({ data }: { data?: { locale: string } }) {
  const locale = isLandingLocale(data?.locale) ? data.locale : 'ar';
  const content = getThanksContent(locale);
  return buildNoindexMeta({ title: content.title, description: content.description, locale });
}

export default function LocaleThanks({
  loaderData,
}: {
  loaderData: { locale: 'ar' | 'en'; tracking: TrackingIds; leadSubmitted: boolean };
}) {
  return (
    <ThanksPage
      locale={loaderData.locale}
      tracking={loaderData.tracking}
      leadSubmitted={loaderData.leadSubmitted}
    />
  );
}
