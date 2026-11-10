import type { LandingLocale } from '../../../lib/locale.js';
import type { LandingImageName } from '../landing-media.generated.js';

export type NavSectionId = 'flow' | 'kitchen' | 'plans' | 'faq';

export type FlowMedia =
  | { kind: 'image'; image: LandingImageName; alt: string }
  | { kind: 'video'; video: 'pos' | 'kds'; poster: LandingImageName; label: string };

export type FlowStop = {
  tag: string;
  title: string;
  body: string;
  media: FlowMedia;
};

export type TicketTone = 'new' | 'cooking' | 'ready';

export type TicketContent = {
  meta: string;
  number: string;
  status: string;
  tone: TicketTone;
  items: Array<{ qty: string; name: string }>;
};

export type PlanKey = 'free' | 'menu' | 'restaurant' | 'business';

export type PlanContent = {
  key: PlanKey;
  name: string;
  /** Integer minor units, as stored in the `plans` table. */
  priceMinor: number;
  currency: 'USD';
  /** Text after the price, e.g. "/ month". Empty for the free plan. */
  unit: string;
  highlight: boolean;
  features: string[];
};

export type PhotoKey = 'tablet' | 'room' | 'pasta' | 'pass' | 'tiramisu';

export type LandingContent = {
  lang: LandingLocale;
  meta: { title: string; description: string };
  skipLink: string;
  nav: {
    brand: string;
    brandLabel: string;
    ariaLabel: string;
    links: Array<{ id: NavSectionId; label: string }>;
    cta: string;
    menuLabel: string;
    switchLabel: string;
    switchName: string;
  };
  hero: {
    wordmark: string;
    h1: string;
    statement: string;
    body: string;
    cta: string;
    tabletTitle: string;
    tabletBody: string;
  };
  photos: Record<PhotoKey, { alt: string; caption: string }>;
  flow: { tag: string; title: string; lead: string; stops: FlowStop[] };
  kitchen: { title: string; tickets: TicketContent[] };
  plans: { title: string; items: PlanContent[] };
  faq: { title: string; items: Array<{ q: string; a: string }> };
  closing: { title: string; body: string; cta: string; ctaSubject: string };
  footer: { rights: string; privacy: string; terms: string; contact: string };
};

export type LegalSection = { heading: string; paragraphs: string[] };

export type LegalPage = {
  title: string;
  description: string;
  sections: LegalSection[];
};

export type LandingLegalContent = {
  back: string;
  privacy: LegalPage;
  terms: LegalPage;
};

export type ThanksContent = {
  title: string;
  description: string;
  heading: string;
  body: string;
  back: string;
};
