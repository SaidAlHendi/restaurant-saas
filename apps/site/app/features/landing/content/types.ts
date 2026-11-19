import type { LandingLocale } from '../../../lib/locale.js';
import type { LandingImageName } from '../landing-media.generated.js';

/** Sections of the home page that the navbar can scroll to. */
export type NavSectionId = 'flow' | 'kitchen';

/** Pages of the site that have their own entry in the navbar. */
export type NavPageId = 'plans' | 'faq' | 'contact';

export type NavKey = NavSectionId | NavPageId;

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
    links: Array<{ key: NavKey; label: string }>;
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
  plans: { title: string; lead: string; items: PlanContent[] };
  faq: { title: string; lead: string; items: Array<{ q: string; a: string }> };
  contact: { title: string; lead: string; emailLabel: string; emailCta: string };
  whatsapp: { label: string; message: string };
  form: {
    title: string;
    labels: Record<'name' | 'restaurantName' | 'phone' | 'email' | 'country' | 'branches' | 'message', string>;
    placeholders: Record<'name' | 'restaurantName' | 'phone' | 'email' | 'message', string>;
    countryPlaceholder: string;
    countries: Array<{ code: string; name: string }>;
    submit: string;
    sending: string;
    privacyNote: string;
    privacyLink: string;
    errors: { required: string; invalid: string; rateLimited: string; unavailable: string };
  };
  /** Two small tiles on the home page that point to the plans and FAQ pages. */
  teasers: {
    plans: { title: string; body: string; cta: string };
    faq: { title: string; body: string; cta: string };
  };
  /** Search title and description of the pages that have their own URL. */
  pages: Record<NavPageId, { title: string; description: string }>;
  closing: { title: string; body: string; cta: string; ctaSubject: string };
  footer: {
    rights: string;
    privacy: string;
    terms: string;
    contact: string;
    cookieSettings: string;
    instagram: string;
    facebook: string;
    tagline: string;
    exploreTitle: string;
    legalTitle: string;
    contactTitle: string;
    whatsapp: string;
    email: string;
    language: string;
    madeFor: string;
  };
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
