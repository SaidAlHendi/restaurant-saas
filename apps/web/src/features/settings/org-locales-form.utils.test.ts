import { describe, expect, it } from 'vitest';

import { validateOrgLocalesForm } from './org-locales-form.utils.js';

describe('validateOrgLocalesForm', () => {
  it('accepts valid locale sets', () => {
    expect(
      validateOrgLocalesForm({ locales: ['en', 'ar'], defaultLocale: 'en' }),
    ).toMatchObject({ ok: true });
    expect(validateOrgLocalesForm({ locales: ['ar'], defaultLocale: 'ar' })).toMatchObject({
      ok: true,
    });
  });

  it('rejects empty locales', () => {
    const result = validateOrgLocalesForm({ locales: [], defaultLocale: 'en' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe('locales');
    }
  });

  it('rejects default locale not in locales', () => {
    const result = validateOrgLocalesForm({ locales: ['en'], defaultLocale: 'ar' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe('defaultLocale');
    }
  });
});
