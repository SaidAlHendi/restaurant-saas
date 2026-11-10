import { describe, expect, it } from 'vitest';

import {
  buildCurvePath,
  buildPlanViews,
  contactHref,
  curveProgress,
  formatPlanPrice,
  imageFallbackSrc,
  imageSrcSet,
  imageUrl,
  isSectionKey,
  navHref,
  switchLocalePath,
} from './landing.utils.js';
import { getLandingContent } from './content/index.js';

describe('image helpers', () => {
  it('builds urls and srcsets from the generated manifest', () => {
    expect(imageUrl('room', 800, 'avif')).toBe('/landing/img/room-800.avif');
    expect(imageSrcSet('tiramisu', 'webp')).toBe(
      '/landing/img/tiramisu-640.webp 640w, /landing/img/tiramisu-1024.webp 1024w',
    );
  });

  it('falls back to the largest jpeg', () => {
    expect(imageFallbackSrc('tiramisu')).toBe('/landing/img/tiramisu-1024.jpg');
  });
});

describe('formatPlanPrice', () => {
  it('shows whole dollars without decimals', () => {
    expect(formatPlanPrice(3900, 'USD', 'en')).toBe('$39');
    expect(formatPlanPrice(0, 'USD', 'en')).toBe('$0');
  });

  it('formats Arabic prices with Arabic digits and the amount first', () => {
    expect(formatPlanPrice(7900, 'USD', 'ar')).toBe('٧٩ $');
    expect(formatPlanPrice(0, 'USD', 'ar')).toBe('٠ $');
  });

  it('falls back to the currency code for currencies without a mark', () => {
    expect(formatPlanPrice(1200, 'KWD', 'en')).toBe('KWD12');
  });
});

describe('contactHref', () => {
  it('encodes the subject', () => {
    expect(contactHref('hello@example.com', 'Free trial request')).toBe(
      'mailto:hello@example.com?subject=Free%20trial%20request',
    );
  });
});

describe('curve geometry', () => {
  it('starts above and ends below the section, passing through each point', () => {
    const d = buildCurvePath(1000, 800, [
      { x: 700, y: 200 },
      { x: 300, y: 600 },
    ]);
    expect(d.startsWith('M 500 -40')).toBe(true);
    expect(d).toContain('700 200');
    expect(d).toContain('300 600');
    expect(d.endsWith('500 880')).toBe(true);
  });

  it('clamps the drawn fraction between 0 and 1', () => {
    expect(curveProgress(2000, 1000, 800)).toBe(0);
    expect(curveProgress(-5000, 1000, 800)).toBe(1);
    const mid = curveProgress(0, 1000, 800);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe('navigation helpers', () => {
  it('scrolls to sections on the home page and links back to them from other pages', () => {
    expect(navHref('ar', 'flow', 'home')).toBe('#flow');
    expect(navHref('ar', 'kitchen', 'plans')).toBe('/ar#kitchen');
    expect(isSectionKey('flow')).toBe(true);
    expect(isSectionKey('faq')).toBe(false);
  });

  it('links pages by path from anywhere', () => {
    expect(navHref('en', 'plans', 'home')).toBe('/en/plans');
    expect(navHref('en', 'contact', 'faq')).toBe('/en/contact');
  });

  it('keeps the page when switching language', () => {
    expect(switchLocalePath('en', 'home')).toBe('/en');
    expect(switchLocalePath('en', 'faq')).toBe('/en/faq');
    expect(switchLocalePath('ar', 'privacy')).toBe('/ar/privacy');
  });
});

describe('buildPlanViews', () => {
  it('adds a formatted price to every plan', () => {
    const views = buildPlanViews(getLandingContent('en').plans.items, 'en');
    expect(views.map((p) => p.price)).toEqual(['$0', '$12', '$39', '$79']);
  });
});
