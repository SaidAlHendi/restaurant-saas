import { data, redirect } from 'react-router';

import { ContactPage } from '../features/landing/components/InnerPages.js';
import { getLandingContent } from '../features/landing/content/index.js';
import { buildContactJsonLd } from '../features/landing/landing-jsonld.server.js';
import { buildInnerPageMeta } from '../features/landing/landing.seo.js';
import { JsonLdScript } from '../features/landing/components/JsonLdScript.js';
import type { TrackingIds } from '../features/consent/tracking.js';
import type { ContactActionData } from '../features/landing/hooks/use-contact-form.js';
import { SITE_CONTACT_EMAIL } from '../lib/brand.js';
import { readLeadForm, validateLeadForm } from '../lib/lead-form.js';
import { LANDING_CACHE_CONTROL, loadLandingRoute } from '../lib/landing-route.server.js';
import { submitLead } from '../lib/leads.server.js';
import { isLandingLocale, landingPath } from '../lib/locale.js';
import { clientIp, createRateLimiter } from '../lib/rate-limit.server.js';
import { serializeJsonLd } from '../lib/seo.js';

export function loader({ params }: { params: { locale?: string } }) {
  const { locale, siteBaseUrl, tracking } = loadLandingRoute(params);
  const jsonLd = serializeJsonLd(
    buildContactJsonLd({
      locale,
      siteBaseUrl,
      content: getLandingContent(locale),
      contactEmail: SITE_CONTACT_EMAIL,
    }),
  );
  return { locale, siteBaseUrl, jsonLd, tracking };
}

/** Three requests per visitor per ten minutes; the API has its own site-wide limit behind this. */
const leadLimiter = createRateLimiter({ limit: 3, windowMs: 10 * 60_000 });

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * The contact form posts here. Bots that fill the hidden field are sent to the thank-you page and
 * nothing is stored; real visitors get field errors back, or a redirect once the API accepted the lead.
 */
export async function action({ request, params }: { request: Request; params: { locale?: string } }) {
  const { locale } = loadLandingRoute(params);
  const read = readLeadForm(await request.formData());
  if (read.honeypot !== '') {
    return redirect(landingPath(locale, 'thanks'));
  }
  const validated = validateLeadForm(read, locale);
  if (!validated.ok) {
    return data<ContactActionData>(
      { values: read.values, errors: validated.errors },
      { status: 400, headers: NO_STORE },
    );
  }
  if (!leadLimiter.allow(clientIp(request))) {
    return data<ContactActionData>(
      { values: read.values, formError: 'rate_limited' },
      { status: 429, headers: NO_STORE },
    );
  }
  const result = await submitLead(validated.body);
  if (!result.ok) {
    return data<ContactActionData>(
      { values: read.values, formError: result.kind },
      { status: result.kind === 'rate_limited' ? 429 : 502, headers: NO_STORE },
    );
  }
  return redirect(landingPath(locale, 'thanks'), { headers: NO_STORE });
}

export function headers({ actionHeaders }: { actionHeaders: Headers }) {
  return actionHeaders.has('Cache-Control') ? actionHeaders : { 'Cache-Control': LANDING_CACHE_CONTROL };
}

export function meta({ data }: { data?: { locale: string; siteBaseUrl: string } }) {
  const locale = isLandingLocale(data?.locale) ? data.locale : 'ar';
  const content = getLandingContent(locale);
  return buildInnerPageMeta({
    ...content.pages.contact,
    locale,
    siteBaseUrl: data?.siteBaseUrl ?? 'http://localhost:5174',
    page: 'contact',
    ogAlt: content.hero.h1,
  });
}

export default function LocaleContact({
  loaderData,
}: {
  loaderData: { locale: 'ar' | 'en'; jsonLd: string; tracking: TrackingIds };
}) {
  return (
    <>
      <ContactPage locale={loaderData.locale} tracking={loaderData.tracking} />
      <JsonLdScript json={loaderData.jsonLd} />
    </>
  );
}
