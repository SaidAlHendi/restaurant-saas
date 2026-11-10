import { describe, expect, it } from 'vitest';

import { buildRobotsTxt, buildSitemapXml } from './sitemap.js';

const SITE = 'https://getsahtain.com/';

describe('buildSitemapXml', () => {
  const xml = buildSitemapXml(SITE, [{ slug: 'al-bait', locales: ['ar', 'en'] }]);

  it('lists landing, privacy and terms in both locales', () => {
    for (const path of ['/ar', '/en', '/ar/privacy', '/en/privacy', '/ar/terms', '/en/terms']) {
      expect(xml).toContain(`<loc>https://getsahtain.com${path}</loc>`);
    }
  });

  it('adds ar/en/x-default alternates to landing pages', () => {
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://getsahtain.com/ar"/>',
    );
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://getsahtain.com/en/privacy"/>',
    );
  });

  it('keeps the restaurant menus and leaves out the thank-you page', () => {
    expect(xml).toContain('<loc>https://getsahtain.com/ar/m/al-bait</loc>');
    expect(xml).toContain('<loc>https://getsahtain.com/en/m/al-bait</loc>');
    expect(xml).not.toContain('thanks');
  });

  it('escapes special characters in slugs', () => {
    const odd = buildSitemapXml(SITE, [{ slug: 'a&b', locales: ['en'] }]);
    expect(odd).toContain('/en/m/a&amp;b</loc>');
  });
});

describe('buildRobotsTxt', () => {
  it('blocks only the table redirects and points to the sitemap', () => {
    const txt = buildRobotsTxt(SITE);
    expect(txt).toContain('Disallow: /t/');
    expect(txt).toContain('Sitemap: https://getsahtain.com/sitemap.xml');
    expect(txt).not.toContain('thanks');
  });
});
