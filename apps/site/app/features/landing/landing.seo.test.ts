import { describe, expect, it } from 'vitest';

import { getLandingContent } from './content/index.js';
import {
  buildInnerPageMeta,
  buildLandingMeta,
  buildNoindexMeta,
  landingUrl,
} from './landing.seo.js';

const SITE = 'https://getsahtain.com';

type Tag = Record<string, string>;

/** Meta descriptors are a union of shapes; tests read them as plain attribute maps. */
function asTags(tags: readonly object[]): Tag[] {
  return tags as unknown as Tag[];
}

function metaValue(tags: Tag[], key: 'name' | 'property', value: string) {
  return tags.find((t) => t[key] === value)?.['content'];
}

describe.each(['ar', 'en'] as const)('landing meta (%s)', (locale) => {
  const content = getLandingContent(locale);
  const tags = asTags(
    buildLandingMeta({ locale, siteBaseUrl: SITE, meta: content.meta, ogAlt: 'alt' }),
  );

  it('keeps title and description within search limits', () => {
    expect(content.meta.title.length).toBeLessThanOrEqual(60);
    expect(content.meta.description.length).toBeLessThanOrEqual(155);
  });

  it('has one canonical per locale and ar/en/x-default alternates', () => {
    const canonical = tags.filter((t) => t['rel'] === 'canonical');
    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.['href']).toBe(`${SITE}/${locale}`);
    const alternates = tags.filter((t) => t['rel'] === 'alternate').map((t) => t['hrefLang']);
    expect(alternates).toEqual(['ar', 'en', 'x-default']);
    expect(tags.find((t) => t['hrefLang'] === 'x-default')?.['href']).toBe(`${SITE}/ar`);
  });

  it('has Open Graph and Twitter tags with a 1200x630 share image', () => {
    expect(metaValue(tags, 'property', 'og:image')).toBe(`${SITE}/landing/og-${locale}.jpg`);
    expect(metaValue(tags, 'property', 'og:image:width')).toBe('1200');
    expect(metaValue(tags, 'property', 'og:image:height')).toBe('630');
    expect(metaValue(tags, 'name', 'twitter:card')).toBe('summary_large_image');
    expect(metaValue(tags, 'property', 'og:url')).toBe(`${SITE}/${locale}`);
  });
});

describe('other page meta', () => {
  it('marks the conversion page noindex', () => {
    const tags = asTags(buildNoindexMeta({ title: 't', description: 'd', locale: 'ar' }));
    expect(metaValue(tags, 'name', 'robots')).toBe('noindex, nofollow');
    expect(tags.some((t) => t['rel'] === 'canonical')).toBe(false);
  });

  it('gives every inner page its own canonical, alternates and share image', () => {
    for (const page of ['plans', 'faq', 'contact', 'privacy', 'terms'] as const) {
      const tags = asTags(
        buildInnerPageMeta({
          title: 't',
          description: 'd',
          locale: 'en',
          siteBaseUrl: SITE,
          page,
          ogAlt: 'alt',
        }),
      );
      expect(tags.find((t) => t['rel'] === 'canonical')?.['href']).toBe(`${SITE}/en/${page}`);
      expect(tags.find((t) => t['hrefLang'] === 'ar')?.['href']).toBe(`${SITE}/ar/${page}`);
      expect(tags.find((t) => t['hrefLang'] === 'x-default')?.['href']).toBe(`${SITE}/ar/${page}`);
      expect(metaValue(tags, 'property', 'og:image')).toBe(`${SITE}/landing/og-en.jpg`);
    }
  });

  it('keeps every page title and description within search limits', () => {
    for (const locale of ['ar', 'en'] as const) {
      const content = getLandingContent(locale);
      for (const page of ['plans', 'faq', 'contact'] as const) {
        expect(content.pages[page].title.length).toBeLessThanOrEqual(60);
        expect(content.pages[page].description.length).toBeLessThanOrEqual(155);
      }
    }
  });

  it('builds clean landing urls', () => {
    expect(landingUrl(SITE, 'ar')).toBe(`${SITE}/ar`);
    expect(landingUrl(SITE, 'en', 'terms')).toBe(`${SITE}/en/terms`);
  });
});
