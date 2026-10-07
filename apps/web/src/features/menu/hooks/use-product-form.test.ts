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
