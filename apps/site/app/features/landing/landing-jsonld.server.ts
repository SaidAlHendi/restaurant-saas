import type { LandingLocale } from '../../lib/locale.js';
import { minorUnitsToMajorString } from '../../lib/seo.js';
import type { LandingContent } from './content/types.js';
import { landingUrl } from './landing.seo.js';

type JsonLdInput = {
  locale: LandingLocale;
  siteBaseUrl: string;
  content: LandingContent;
  contactEmail: string;
};

const CONTEXT = 'https://schema.org';

function base(siteBaseUrl: string): string {
  return siteBaseUrl.replace(/\/$/, '');
}

function organization(input: JsonLdInput) {
  const root = base(input.siteBaseUrl);
  return {
    '@type': 'Organization',
    '@id': `${root}/#organization`,
    name: input.content.hero.wordmark,
    url: root,
    contactPoint: { '@type': 'ContactPoint', email: input.contactEmail, contactType: 'sales' },
  };
}

function softwareApplication(input: JsonLdInput, withOffers: boolean) {
  const { locale, siteBaseUrl, content } = input;
  const url = landingUrl(siteBaseUrl, locale, withOffers ? 'plans' : undefined);
  return {
    '@type': 'SoftwareApplication',
    name: content.hero.wordmark,
    description: content.meta.description,
    url,
    inLanguage: locale,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    // Offers are published only next to the visible prices, on the plans page, with the real prices.
    ...(withOffers
      ? {
          offers: content.plans.items.map((plan) => ({
            '@type': 'Offer',
            name: plan.name,
            price: minorUnitsToMajorString(plan.priceMinor, plan.currency),
            priceCurrency: plan.currency,
            url,
          })),
        }
      : {}),
  };
}

/** Home: the organization, the website and the application. */
export function buildLandingJsonLd(input: JsonLdInput) {
  const root = base(input.siteBaseUrl);
  return {
    '@context': CONTEXT,
    '@graph': [
      organization(input),
      {
        '@type': 'WebSite',
        '@id': `${root}/#website`,
        name: input.content.hero.wordmark,
        url: landingUrl(input.siteBaseUrl, input.locale),
        inLanguage: input.locale,
        publisher: { '@id': `${root}/#organization` },
      },
      softwareApplication(input, false),
    ],
  };
}

/** Plans page: the application with one offer per plan, at the real prices. */
export function buildPlansJsonLd(input: JsonLdInput) {
  return { '@context': CONTEXT, '@graph': [softwareApplication(input, true)] };
}

/** FAQ page: built from the same content as the visible FAQ, so the markup cannot drift from the text. */
export function buildFaqJsonLd(input: JsonLdInput) {
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: input.content.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
}

export function buildContactJsonLd(input: JsonLdInput) {
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'ContactPage',
        name: input.content.pages.contact.title,
        url: landingUrl(input.siteBaseUrl, input.locale, 'contact'),
        inLanguage: input.locale,
        about: { '@id': `${base(input.siteBaseUrl)}/#organization` },
      },
    ],
  };
}
