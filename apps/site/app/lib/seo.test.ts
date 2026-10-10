import { describe, expect, it } from 'vitest';

import type { PublicMenuPayload } from '@app/shared';

import {
  buildMenuJsonLd,
  buildMenuPageMeta,
  minorUnitsToMajorString,
  serializeJsonLd,
} from './seo.js';

const sampleMenu: PublicMenuPayload = {
  org: {
    name: 'Demo',
    slug: 'demo',
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    currency: 'SAR',
    logoUrl: null,
  },
  branches: [{ name: 'Main', slug: 'main', address: null }],
  categories: [
    {
      id: '00000000-0000-4000-8000-000000000401',
      name: 'Mains',
      sortOrder: 0,
      products: [
        {
          id: '00000000-0000-4000-8000-000000000402',
          name: 'Burger',
          description: 'Tasty',
          priceMinor: 1500,
          currency: 'SAR',
          sortOrder: 0,
          imageUrls: null,
          modifierGroups: [],
        },
      ],
    },
  ],
  effectiveLocale: 'en',
};

describe('seo', () => {
  it('buildMenuPageMeta canonical has no table query', () => {
    const meta = buildMenuPageMeta({
      menu: sampleMenu,
      locale: 'en',
      canonical: 'https://menu.example/en/m/demo',
      siteBaseUrl: 'https://menu.example',
      orgSlug: 'demo',
    });
    const canonical = meta.find(
      (m) => 'rel' in m && m.rel === 'canonical',
    ) as { href?: string } | undefined;
    expect(canonical?.href).toBe('https://menu.example/en/m/demo');
    expect(canonical?.href?.includes('table=')).toBe(false);
  });

  it('hreflang only lists org locales', () => {
    const meta = buildMenuPageMeta({
      menu: sampleMenu,
      locale: 'en',
      canonical: 'https://menu.example/en/m/demo',
      siteBaseUrl: 'https://menu.example',
      orgSlug: 'demo',
    });
    const alternates = meta.filter(
      (m) => 'hrefLang' in m && m.rel === 'alternate',
    ) as Array<{ hrefLang?: string }>;
    expect(alternates.map((a) => a.hrefLang).sort()).toEqual(['ar', 'en']);
  });

  it('serializeJsonLd escapes script breakouts in product names', () => {
    const maliciousName = '</script><script>alert(1)</script>';
    const baseCategory = sampleMenu.categories[0];
    const baseProduct = baseCategory?.products[0];
    if (baseCategory === undefined || baseProduct === undefined) {
      throw new Error('sampleMenu fixture must include a category and product');
    }
    const menuWithXss: PublicMenuPayload = {
      ...sampleMenu,
      categories: [
        {
          ...baseCategory,
          products: [
            {
              ...baseProduct,
              name: maliciousName,
            },
          ],
        },
      ],
    };
    const jsonLd = buildMenuJsonLd({
      menu: menuWithXss,
      locale: 'en',
      url: 'https://menu.example/en/m/demo',
    });
    const serialized = serializeJsonLd(jsonLd);
    expect(serialized.includes('</script>')).toBe(false);
    expect(serialized.includes('<script')).toBe(false);
    expect(serialized.includes('<')).toBe(false);
    expect(serialized).toContain('alert(1)');
    expect(/\\u003[cC]/.test(serialized)).toBe(true);
  });

  it('buildMenuJsonLd uses major units per currency', () => {
    const jsonLd = buildMenuJsonLd({
      menu: sampleMenu,
      locale: 'en',
      url: 'https://menu.example/en/m/demo',
    }) as {
      hasMenu: { hasMenuSection: Array<{ hasMenuItem: Array<{ offers: { price: string } }> }> };
    };
    const price = jsonLd.hasMenu.hasMenuSection[0]?.hasMenuItem[0]?.offers.price;
    expect(price).toBe(minorUnitsToMajorString(1500, 'SAR'));
  });
});
