import { describe, expect, it } from 'vitest';

import { isLandingLocale, landingPath, negotiateLocale, otherLocale } from './locale.js';

describe('negotiateLocale', () => {
  it('defaults to Arabic without a header', () => {
    expect(negotiateLocale(undefined)).toBe('ar');
    expect(negotiateLocale(null)).toBe('ar');
    expect(negotiateLocale('')).toBe('ar');
  });

  it('picks Arabic for any Arabic variant', () => {
    expect(negotiateLocale('ar-SA,ar;q=0.9,en;q=0.8')).toBe('ar');
    expect(negotiateLocale('ar')).toBe('ar');
  });

  it('picks English when English is preferred', () => {
    expect(negotiateLocale('en-US,en;q=0.9')).toBe('en');
    expect(negotiateLocale('en-GB,ar;q=0.5')).toBe('en');
  });

  it('prefers Arabic on a tie and for unrelated languages', () => {
    expect(negotiateLocale('ar,en')).toBe('ar');
    expect(negotiateLocale('de-DE,fr;q=0.8')).toBe('ar');
  });

  it('ignores languages with q=0 and malformed weights', () => {
    expect(negotiateLocale('ar;q=0,en')).toBe('en');
    expect(negotiateLocale('ar;q=abc,en;q=0.5')).toBe('en');
  });
});

describe('locale helpers', () => {
  it('recognises landing locales', () => {
    expect(isLandingLocale('ar')).toBe(true);
    expect(isLandingLocale('en')).toBe(true);
    expect(isLandingLocale('fr')).toBe(false);
    expect(isLandingLocale(undefined)).toBe(false);
  });

  it('returns the other locale', () => {
    expect(otherLocale('ar')).toBe('en');
    expect(otherLocale('en')).toBe('ar');
  });

  it('builds clean paths without a trailing slash', () => {
    expect(landingPath('ar')).toBe('/ar');
    expect(landingPath('en', 'privacy')).toBe('/en/privacy');
  });
});
