import type { LandingLocale } from '../../../lib/locale.js';
import { useLeadConversion } from '../../consent/hooks/use-lead-conversion.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { getThanksContent } from '../content/index.js';
import { useSiteShell } from './use-site-shell.js';

/** The thank-you page: the only place the lead conversion fires, and only after consent. */
export function useThanksPage(locale: LandingLocale, tracking: TrackingIds) {
  const shell = useSiteShell(locale, tracking, 'thanks');
  useLeadConversion(tracking, shell.consent.choice);
  return {
    shell,
    content: getThanksContent(locale),
  };
}
