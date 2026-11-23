import { useMemo } from 'react';

import { SITE_CONTACT_EMAIL } from '../../../lib/brand.js';
import { landingPath, type LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { buildPlanTable, buildPlanViews } from '../landing.utils.js';
import { useSiteShell } from './use-site-shell.js';

/** The plans, FAQ and contact pages: the shared shell plus their content. */
export function useInnerPage(locale: LandingLocale, tracking: TrackingIds, current: 'plans' | 'faq' | 'contact') {
  const shell = useSiteShell(locale, tracking, current);
  const { content } = shell;
  const plans = useMemo(() => buildPlanViews(content.plans.items, locale), [content, locale]);
  const planTable = useMemo(() => buildPlanTable(content.plans.rows), [content]);
  return {
    shell,
    content,
    plans,
    planTable,
    links: {
      contact: landingPath(locale, 'contact'),
      email: SITE_CONTACT_EMAIL,
      mailto: shell.links.mailto,
    },
  };
}
