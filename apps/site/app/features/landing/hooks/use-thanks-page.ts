import { landingPath, type LandingLocale } from '../../../lib/locale.js';
import { getConsentContent } from '../../consent/content.js';
import { useConsent } from '../../consent/hooks/use-consent.js';
import { useLeadConversion } from '../../consent/hooks/use-lead-conversion.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { getThanksContent } from '../content/index.js';

/** The thank-you page: the only place the lead conversion fires, and only after consent. */
export function useThanksPage(locale: LandingLocale, tracking: TrackingIds) {
  const consent = useConsent(tracking);
  useLeadConversion(tracking, consent.choice);
  return {
    content: getThanksContent(locale),
    homeHref: landingPath(locale),
    privacyHref: landingPath(locale, 'privacy'),
    consent,
    consentContent: getConsentContent(locale),
  };
}
