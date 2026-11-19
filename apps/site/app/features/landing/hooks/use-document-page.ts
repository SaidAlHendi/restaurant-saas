import { SITE_CONTACT_EMAIL } from '../../../lib/brand.js';
import type { LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { getLegalContent } from '../content/index.js';
import { useSiteShell } from './use-site-shell.js';

/** Privacy and terms: the shared shell plus the legal text. */
export function useDocumentPage(locale: LandingLocale, kind: 'privacy' | 'terms', tracking: TrackingIds) {
  const legal = getLegalContent(locale);
  return {
    shell: useSiteShell(locale, tracking, kind),
    page: legal[kind],
    contactEmail: SITE_CONTACT_EMAIL,
  };
}
