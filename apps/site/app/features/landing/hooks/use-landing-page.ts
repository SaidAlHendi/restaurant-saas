import { landingPath, type LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useCurveLine } from './use-curve-line.js';
import { useSiteShell } from './use-site-shell.js';

/** The home page: the shared shell, its content, the call-to-action targets and the curved scroll line. */
export function useLandingPage(locale: LandingLocale, tracking: TrackingIds) {
  const shell = useSiteShell(locale, tracking, 'home');
  return {
    shell,
    content: shell.content,
    curve: useCurveLine(),
    links: {
      contact: landingPath(locale, 'contact'),
      plans: landingPath(locale, 'plans'),
      faq: landingPath(locale, 'faq'),
    },
  };
}
