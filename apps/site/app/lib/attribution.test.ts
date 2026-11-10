import { describe, expect, it } from 'vitest';

import { hasCampaignData, parseAttribution } from './attribution.js';

describe('parseAttribution', () => {
  it('keeps utm_*, gclid and fbclid and ignores everything else', () => {
    const result = parseAttribution(
      '?utm_source=google&utm_medium=cpc&utm_campaign=riyadh&gclid=abc123&fbclid=xyz&q=secret',
      'https://www.google.com/',
      '/ar',
    );
    expect(result).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'riyadh',
      gclid: 'abc123',
      fbclid: 'xyz',
      referrer: 'https://www.google.com/',
      landingPath: '/ar',
    });
  });

  it('works without campaign data or a referrer', () => {
    const result = parseAttribution('', '', '/en');
    expect(result).toEqual({ landingPath: '/en' });
    expect(hasCampaignData(result)).toBe(false);
  });

  it('caps very long values', () => {
    const result = parseAttribution(`?utm_source=${'a'.repeat(500)}`, '', '/ar');
    expect(result.utm_source).toHaveLength(200);
    expect(hasCampaignData(result)).toBe(true);
  });
});
