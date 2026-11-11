import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadTags, trackLead } from './tags.client.js';
import type { TrackingIds } from './tracking.js';

const ALL: TrackingIds = { ga4: 'G-ABC123XYZ9', metaPixel: '123456789012345', googleAds: 'AW-1234567890' };
const NONE: TrackingIds = { ga4: null, metaPixel: null, googleAds: null };

function scripts(): string[] {
  return [...document.head.querySelectorAll('script')].map((s) => s.src);
}

beforeEach(() => {
  document.head.innerHTML = '';
  const w = window as unknown as Record<string, unknown>;
  for (const key of ['dataLayer', 'gtag', 'fbq', '_fbq']) {
    Reflect.deleteProperty(w, key);
  }
});

afterEach(() => {
  document.head.innerHTML = '';
});

describe('loadTags', () => {
  it('loads nothing when no ids are configured', () => {
    loadTags(NONE);
    expect(scripts()).toEqual([]);
  });

  it('loads gtag once for GA4 and Google Ads, and the Meta pixel', () => {
    loadTags(ALL);
    expect(scripts()).toEqual([
      'https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ9',
      'https://connect.facebook.net/en_US/fbevents.js',
    ]);
  });

  it('is safe to call twice', () => {
    loadTags(ALL);
    loadTags(ALL);
    expect(scripts()).toHaveLength(2);
  });

  it('configures every gtag destination', () => {
    loadTags(ALL);
    const layer = (window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer;
    const commands = layer.map((entry) => [...Array.from(entry)]);
    expect(commands.filter((c) => c[0] === 'config').map((c) => c[1])).toEqual([
      'G-ABC123XYZ9',
      'AW-1234567890',
    ]);
  });
});

describe('trackLead', () => {
  it('does nothing before the tags are loaded', () => {
    expect(() => {
      trackLead(ALL);
    }).not.toThrow();
  });

  it('sends generate_lead and Lead once the tags are loaded', () => {
    loadTags(ALL);
    trackLead(ALL);
    const layer = (window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer;
    expect(layer.some((e) => e[0] === 'event' && e[1] === 'generate_lead')).toBe(true);
    const fbq = (window as unknown as { fbq: { queue: unknown[][] } }).fbq;
    expect(fbq.queue.some((c) => c[0] === 'track' && c[1] === 'Lead')).toBe(true);
  });
});
