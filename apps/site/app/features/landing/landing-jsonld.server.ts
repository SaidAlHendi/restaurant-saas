import type { LandingLocale } from '../../lib/locale.js';
import { minorUnitsToMajorString } from '../../lib/seo.js';
import type { LandingContent } from './content/types.js';
import { landingUrl } from './landing.seo.js';

/**
 * Structured data for the landing page. The FAQPage entries are built from the same content
 * as the visible FAQ, so the markup can never drift from what the visitor reads. Offers use the
 * real plan prices.
 */
export function buildLandingJsonLd(input: {
  locale: LandingLocale;
  siteBaseUrl: string;
  content: LandingContent;
  contactEmail: string;
}) {
  const { locale, siteBaseUrl, content, contactEmail } = input;
  const url = landingUrl(siteBaseUrl, locale);
  const name = content.hero.wordmark;
  const base = siteBaseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name,
        url: base,
        contactPoint: { '@type': 'ContactPoint', email: contactEmail, contactType: 'sales' },
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        name,
        url,
        inLanguage: locale,
        publisher: { '@id': `${base}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        name,
        description: content.meta.description,
        url,
        inLanguage: locale,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: content.plans.items.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          price: minorUnitsToMajorString(plan.priceMinor, plan.currency),
          priceCurrency: plan.currency,
          url: `${url}#plans`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: content.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
}
