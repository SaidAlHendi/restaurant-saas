import { describe, expect, it } from 'vitest';

import { getLandingContent } from './content/index.js';
import { buildLandingJsonLd } from './landing-jsonld.server.js';

const SITE = 'https://getsahtain.com';

describe('landing JSON-LD', () => {
  const content = getLandingContent('en');
  const graph = buildLandingJsonLd({
    locale: 'en',
    siteBaseUrl: SITE,
    content,
    contactEmail: 'hello@example.com',
  })['@graph'];

  it('contains organization, website, software application and FAQ', () => {
    expect(graph.map((n) => n['@type'])).toEqual([
      'Organization',
      'WebSite',
      'SoftwareApplication',
      'FAQPage',
    ]);
  });

  it('publishes the real plan prices as offers', () => {
    const app = graph.find((n) => n['@type'] === 'SoftwareApplication') as {
      offers: Array<{ name: string; price: string; priceCurrency: string }>;
    };
    expect(app.offers.map((o) => [o.name, o.price, o.priceCurrency])).toEqual([
      ['Free', '0.00', 'USD'],
      ['Menu', '12.00', 'USD'],
      ['Restaurant', '39.00', 'USD'],
      ['Business', '79.00', 'USD'],
    ]);
  });

  it('matches the visible FAQ text exactly', () => {
    const faq = graph.find((n) => n['@type'] === 'FAQPage') as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      content.faq.items.map((i) => [i.q, i.a]),
    );
  });
});
