import { describe, expect, it } from 'vitest';

import { getLandingContent } from './content/index.js';
import {
  buildContactJsonLd,
  buildFaqJsonLd,
  buildLandingJsonLd,
  buildPlansJsonLd,
} from './landing-jsonld.server.js';

const SITE = 'https://getsahtain.com';
const content = getLandingContent('en');
const input = { locale: 'en', siteBaseUrl: SITE, content, contactEmail: 'hello@example.com' } as const;

type Node = Record<string, unknown>;
const types = (doc: { '@graph': Node[] }) => doc['@graph'].map((n) => n['@type']);

describe('home JSON-LD', () => {
  const doc = buildLandingJsonLd(input);

  it('describes the organization, website and application', () => {
    expect(types(doc)).toEqual(['Organization', 'WebSite', 'SoftwareApplication']);
  });

  it('keeps prices off the home page, where no prices are shown', () => {
    expect(JSON.stringify(doc)).not.toContain('"offers"');
  });
});

describe('plans JSON-LD', () => {
  const doc = buildPlansJsonLd(input);

  it('publishes the real plan prices as offers', () => {
    const app = doc['@graph'][0] as unknown as {
      url: string;
      offers: Array<{ name: string; price: string; priceCurrency: string }>;
    };
    expect(app.url).toBe(`${SITE}/en/plans`);
    expect(app.offers.map((o) => [o.name, o.price, o.priceCurrency])).toEqual([
      ['Free', '0.00', 'USD'],
      ['Menu', '12.00', 'USD'],
      ['Restaurant', '39.00', 'USD'],
      ['Business', '79.00', 'USD'],
    ]);
  });
});

describe('FAQ JSON-LD', () => {
  const doc = buildFaqJsonLd(input);

  it('matches the visible FAQ text exactly', () => {
    const faq = doc['@graph'][0] as unknown as {
      '@type': string;
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      content.faq.items.map((i) => [i.q, i.a]),
    );
  });
});

describe('contact JSON-LD', () => {
  it('is a ContactPage about the organization', () => {
    const page = buildContactJsonLd(input)['@graph'][0] as unknown as Node;
    expect(page['@type']).toBe('ContactPage');
    expect(page['url']).toBe(`${SITE}/en/contact`);
  });
});
