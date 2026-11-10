import { SITE_CONTACT_EMAIL } from '../../../lib/brand.js';
import { landingPath, type LandingLocale } from '../../../lib/locale.js';
import { getConsentContent } from '../../consent/content.js';
import { useConsent } from '../../consent/hooks/use-consent.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { getLegalContent } from '../content/index.js';

export function useDocumentPage(
  locale: LandingLocale,
  kind: 'privacy' | 'terms',
  tracking: TrackingIds,
) {
  const legal = getLegalContent(locale);
  const consent = useConsent(tracking);
  return {
    page: legal[kind],
    back: legal.back,
    brand: locale === 'ar' ? 'صحتين' : 'Sahtain',
    homeHref: landingPath(locale),
    privacyHref: landingPath(locale, 'privacy'),
    contactEmail: SITE_CONTACT_EMAIL,
    consent,
    consentContent: getConsentContent(locale),
  };
}
