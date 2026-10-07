import { describe, expect, it } from 'vitest';

import { localizedFormToApi } from '../menu.utils.js';
import { buildProductFormSchema } from './use-product-form.js';

describe('buildProductFormSchema', () => {
  const categoryId = '01934567-89ab-7cde-b012-3456789abcde';

  it('maps localized name fields to API body shape', () => {
    const parsed = buildProductFormSchema(['en', 'ar'], 'en', [categoryId]).parse({
      categoryId,
      name: { en: 'Burger', ar: 'برجر' },
      description: { en: '', ar: '' },
      priceMinor: 1500,
      isActive: true,
      modifierGroupIds: [],
    });

    const org = { defaultLocale: 'en', locales: ['en', 'ar'] as string[] };
    expect(localizedFormToApi(parsed.name, org)).toEqual({ en: 'Burger', ar: 'برجر' });
  });

  it('rejects negative and non-integer prices', () => {
    const schema = buildProductFormSchema(['en'], 'en', [categoryId]);
    expect(() =>
      schema.parse({
        categoryId,
        name: { en: 'Tea' },
        description: { en: '' },
        priceMinor: -1,
        isActive: true,
        modifierGroupIds: [],
      }),
    ).toThrow();
    expect(() =>
      schema.parse({
        categoryId,
        name: { en: 'Tea' },
        description: { en: '' },
        priceMinor: 10.5,
        isActive: true,
        modifierGroupIds: [],
      }),
    ).toThrow();
  });

  it('keeps price in integer minor units', () => {
    const parsed = buildProductFormSchema(['en'], 'en', [categoryId]).parse({
      categoryId,
      name: { en: 'Tea' },
      description: { en: '' },
      priceMinor: 1250,
      isActive: true,
      modifierGroupIds: [],
    });
    expect(parsed.priceMinor).toBe(1250);
  });

  it('requires default locale name', () => {
    expect(() =>
      buildProductFormSchema(['en', 'ar'], 'en', [categoryId]).parse({
        categoryId,
        name: { en: '', ar: 'x' },
        description: { en: '', ar: '' },
        priceMinor: 0,
        isActive: true,
        modifierGroupIds: [],
      }),
    ).toThrow();
  });
});
