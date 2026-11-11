import { useMemo } from 'react';
import { useRouteLoaderData } from 'react-router';

import {
  FACEBOOK_PLACEHOLDER_URL,
  INSTAGRAM_PLACEHOLDER_URL,
  SITE_CONTACT_EMAIL,
  WHATSAPP_PLACEHOLDER_NUMBER,
} from '../../../lib/brand.js';
import { landingPath, otherLocale, type LandingLocale } from '../../../lib/locale.js';
import type { RootLoaderData } from '../../../lib/root-data.js';
import { whatsappHref } from '../../../lib/whatsapp.js';
import { getConsentContent } from '../../consent/content.js';
import { useConsent } from '../../consent/hooks/use-consent.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { getLandingContent } from '../content/index.js';
import type { NavKey, NavSectionId } from '../content/types.js';
import {
  contactHref,
  isSectionKey,
  navHref,
  switchLocalePath,
  type CurrentPage,
} from '../landing.utils.js';
import { useAttributionCapture } from './use-attribution-capture.js';
import { useLandingMotion } from './use-landing-motion.js';
import { useLandingNav } from './use-landing-nav.js';

/** `aria-current` value for a nav link: section links scroll within the page, the others are pages of their own. */
function currentToken(active: boolean, key: NavKey): 'location' | 'page' | undefined {
  if (!active) {
    return undefined;
  }
  return isSectionKey(key) ? 'location' : 'page';
}

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
  const social = root?.social ?? {
    instagram: INSTAGRAM_PLACEHOLDER_URL,
    facebook: FACEBOOK_PLACEHOLDER_URL,
  };

  const navLinks = useMemo(
    () =>
      content.nav.links.map((link) => ({
        ...link,
        href: navHref(locale, link.key, current),
        active: nav.activeKey === link.key,
        current: currentToken(nav.activeKey === link.key, link.key),
      })),
    [content, locale, current, nav.activeKey],
  );

  return {
    content,
    rootRef,
    nav,
    navLinks,
    consent,
    social,
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
