import { useMemo } from 'react';

import { SITE_CONTACT_EMAIL } from '../../../lib/brand.js';
import { landingPath, otherLocale, type LandingLocale } from '../../../lib/locale.js';
import { getConsentContent } from '../../consent/content.js';
import { useConsent } from '../../consent/hooks/use-consent.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { getLandingContent } from '../content/index.js';
import { contactHref, formatPlanPrice } from '../landing.utils.js';
import { useAttributionCapture } from './use-attribution-capture.js';
import { useCurveLine } from './use-curve-line.js';
import { useLandingMotion } from './use-landing-motion.js';
import { useLandingNav } from './use-landing-nav.js';

/** View model of the landing page: content, derived links and prices, and the scroll behaviours. */
export function useLandingPage(locale: LandingLocale, tracking: TrackingIds) {
  const content = getLandingContent(locale);
  const sectionIds = useMemo(() => content.nav.links.map((link) => link.id), [content]);
  const nav = useLandingNav(sectionIds);
  const curve = useCurveLine();
  const { rootRef } = useLandingMotion();
  const consent = useConsent(tracking);
  useAttributionCapture();

  const plans = useMemo(
    () =>
      content.plans.items.map((plan) => ({
        ...plan,
        price: formatPlanPrice(plan.priceMinor, plan.currency, locale),
      })),
    [content, locale],
  );

  return {
    content,
    plans,
    nav,
    curve,
    rootRef,
    consent,
    consentContent: getConsentContent(locale),
    links: {
      switchHref: landingPath(otherLocale(locale)),
      switchLang: otherLocale(locale),
      privacy: landingPath(locale, 'privacy'),
      terms: landingPath(locale, 'terms'),
      contact: `mailto:${SITE_CONTACT_EMAIL}`,
      trial: contactHref(SITE_CONTACT_EMAIL, content.closing.ctaSubject),
    },
  };
}

export type LandingPageViewModel = ReturnType<typeof useLandingPage>;
