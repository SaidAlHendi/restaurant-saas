import { describe, expect, it } from 'vitest';

import { leadCreateBodySchema, normalizeDigits } from './lead-schemas.js';

const valid = {
  name: 'Sara Al-Qahtani',
  restaurantName: 'Qahwa Cafe',
  phone: '+966 50 123 4567',
  email: 'Sara@Example.com',
  country: 'sa',
  branches: 2,
  locale: 'ar',
};

describe('leadCreateBodySchema', () => {
  it('accepts a complete request and normalizes email and country', () => {
    const parsed = leadCreateBodySchema.parse(valid);
    expect(parsed.email).toBe('sara@example.com');
    expect(parsed.country).toBe('SA');
    expect(parsed.message).toBeUndefined();
  });

  it('accepts Arabic-Indic digits in the phone number', () => {
    const parsed = leadCreateBodySchema.parse({ ...valid, phone: '٠٥٠ ١٢٣ ٤٥٦٧' });
    expect(parsed.phone).toBe('050 123 4567');
    expect(normalizeDigits('۱۲۳')).toBe('123');
  });

  it.each([
    ['empty name', { name: ' ' }],
    ['one-letter restaurant', { restaurantName: 'a' }],
    ['text phone', { phone: 'call me' }],
    ['short phone', { phone: '123' }],
    ['invalid email', { email: 'not-an-email' }],
    ['three-letter country', { country: 'SAU' }],
    ['zero branches', { branches: 0 }],
    ['fractional branches', { branches: 1.5 }],
    ['too many branches', { branches: 1000 }],
    ['unknown locale', { locale: 'fr' }],
    ['very long message', { message: 'x'.repeat(1001) }],
  ])('rejects %s', (_label, patch) => {
    expect(leadCreateBodySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('keeps campaign attribution and the honeypot', () => {
    const parsed = leadCreateBodySchema.parse({
      ...valid,
      attribution: { utm_source: 'google', gclid: 'abc', landingPath: '/ar' },
      website: '',
    });
    expect(parsed.attribution?.utm_source).toBe('google');
    expect(parsed.website).toBe('');
  });

  it('rejects over-long attribution values instead of storing them', () => {
    const result = leadCreateBodySchema.safeParse({
      ...valid,
      attribution: { utm_source: 'a'.repeat(201) },
    });
    expect(result.success).toBe(false);
  });
});
