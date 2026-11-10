import { describe, expect, it } from 'vitest';

import { consentCookie, parseConsent } from './consent.utils.js';
import { gtagIds, gtagScriptUrl, hasTracking, parseTrackingIds } from './tracking.js';

describe('parseTrackingIds', () => {
  it('accepts well-formed ids', () => {
    const ids = parseTrackingIds({
      ga4: 'G-ABC123XYZ9',
      metaPixel: '123456789012345',
      googleAds: 'AW-1234567890',
    });
    expect(ids).toEqual({
      ga4: 'G-ABC123XYZ9',
      metaPixel: '123456789012345',
      googleAds: 'AW-1234567890',
    });
    expect(hasTracking(ids)).toBe(true);
    expect(gtagIds(ids)).toEqual(['G-ABC123XYZ9', 'AW-1234567890']);
  });

  it('drops missing or malformed ids so nothing odd reaches a script url', () => {
    const ids = parseTrackingIds({ ga4: 'G-1"></script>', metaPixel: 'abc', googleAds: '' });
    expect(ids).toEqual({ ga4: null, metaPixel: null, googleAds: null });
    expect(hasTracking(ids)).toBe(false);
  });

  it('builds the gtag loader url', () => {
    expect(gtagScriptUrl('G-ABC123XYZ9')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9',
    );
  });
});

describe('consent cookie', () => {
  it('round-trips the choice', () => {
    expect(parseConsent(consentCookie('accepted', false).split(';')[0] ?? '')).toBe('accepted');
    expect(parseConsent('a=1; sahtain_consent=rejected; b=2')).toBe('rejected');
  });

  it('returns null when absent or invalid', () => {
    expect(parseConsent('')).toBeNull();
    expect(parseConsent('sahtain_consent=maybe')).toBeNull();
  });

  it('sets a one-year first-party cookie, Secure only on https', () => {
    expect(consentCookie('accepted', true)).toContain('Max-Age=31536000');
    expect(consentCookie('accepted', true)).toContain('Secure');
    expect(consentCookie('rejected', false)).not.toContain('Secure');
    expect(consentCookie('rejected', false)).toContain('SameSite=Lax');
  });
});
