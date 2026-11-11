import { useMemo } from 'react';
import { useRouteLoaderData } from 'react-router';

import { SITE_CONTACT_EMAIL, WHATSAPP_PLACEHOLDER_NUMBER } from '../../../lib/brand.js';
import { landingPath, otherLocale, type LandingLocale } from '../../../lib/locale.js';
import type { RootLoaderData } from '../../../lib/root-data.js';
import { whatsappHref } from '../../../lib/whatsapp.js';
import { getConsentContent } from '../../consent/content.js';
import { useConsent } from '../../consent/hooks/use-consent.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { getLandingContent } from '../content/index.js';
import type { NavSectionId } from '../content/types.js';
import { contactHref, navHref, switchLocalePath, type CurrentPage } from '../landing.utils.js';
import { useAttributionCapture } from './use-attribution-capture.js';
import { useLandingMotion } from './use-landing-motion.js';
import { useLandingNav } from './use-landing-nav.js';

const HOME_SECTIONS: readonly NavSectionId[] = ['flow', 'kitchen'];

/** Everything every page shares: navbar, footer links, consent, scroll polish and attribution. */
export function useSiteShell(locale: LandingLocale, tracking: TrackingIds, current: CurrentPage) {
  const content = getLandingContent(locale);
  const nav = useLandingNav(HOME_SECTIONS, current);
  const consent = useConsent(tracking);
  const { rootRef } = useLandingMotion();
  useAttributionCapture();
  const root = useRouteLoaderData<RootLoaderData>('root');
  const whatsappNumber = root?.whatsappNumber ?? WHATSAPP_PLACEHOLDER_NUMBER;

  const navLinks = useMemo(
    () =>
      content.nav.links.map((link) => ({
        ...link,
        href: navHref(locale, link.key, current),
        active: nav.activeKey === link.key,
      })),
    [content, locale, current, nav.activeKey],
  );

  return {
    content,
    rootRef,
    nav,
    navLinks,
    consent,
    consentContent: getConsentContent(locale),
    whatsapp: {
      href: whatsappHref(whatsappNumber, content.whatsapp.message),
      label: content.whatsapp.label,
    },
    links: {
      home: landingPath(locale),
      switchHref: switchLocalePath(otherLocale(locale), current),
      switchLang: otherLocale(locale),
      privacy: landingPath(locale, 'privacy'),
      terms: landingPath(locale, 'terms'),
      contact: landingPath(locale, 'contact'),
      mailto: contactHref(SITE_CONTACT_EMAIL, content.closing.ctaSubject),
    },
  };
}

export type SiteShellViewModel = ReturnType<typeof useSiteShell>;
