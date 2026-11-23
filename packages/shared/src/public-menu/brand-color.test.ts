import { describe, expect, it } from 'vitest';

import {
  BRAND_MIN_CONTRAST,
  BRAND_TEXT_MIN_CONTRAST,
  contrastRatio,
  relativeLuminance as relativeLuminanceOf,
  readableTextOn,
  resolveBrandColor,
} from './brand-color.js';

const LIGHT_BG = '#f3eee2';
const DARK_BG = '#101418';

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

describe('readableTextOn', () => {
  it('uses white on dark colours and near-black on light ones', () => {
    expect(readableTextOn('#1f4a37')).toBe('#ffffff');
    expect(readableTextOn('#e8c46a')).toBe('#111111');
  });

  it('always reaches 4.5:1, including mid tones', () => {
    for (let v = 0; v <= 255; v += 5) {
      const color = `#${[v, 255 - v, (v * 7) % 256].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      expect(contrastRatio(color, readableTextOn(color))).toBeGreaterThanOrEqual(BRAND_TEXT_MIN_CONTRAST);
    }
    for (const grey of ['#757575', '#777777', '#808080', '#8a8a8a']) {
      expect(contrastRatio(grey, readableTextOn(grey))).toBeGreaterThanOrEqual(BRAND_TEXT_MIN_CONTRAST);
    }
  });
});

describe('resolveBrandColor', () => {
  it('keeps a colour that has 3:1 against the background', () => {
    const result = resolveBrandColor('#1F4A37', LIGHT_BG);
    expect(result).toEqual({ color: '#1f4a37', foreground: '#ffffff', adjusted: false });
  });

  it('accepts a colour between 3:1 and 4.5:1 without adjusting (it is not text)', () => {
    const mid = '#808080';
    const midRatio = contrastRatio(mid, LIGHT_BG);
    expect(midRatio).toBeGreaterThan(BRAND_MIN_CONTRAST);
    expect(midRatio).toBeLessThan(BRAND_TEXT_MIN_CONTRAST);
    expect(resolveBrandColor(mid, LIGHT_BG).adjusted).toBe(false);
  });

  it('darkens a pale colour on a light background until it passes 3:1', () => {
    const result = resolveBrandColor('#f5e9b8', LIGHT_BG);
    expect(result.adjusted).toBe(true);
    expect(contrastRatio(result.color, LIGHT_BG)).toBeGreaterThanOrEqual(BRAND_MIN_CONTRAST);
    expect(relativeLuminanceOf(result.color)).toBeLessThan(relativeLuminanceOf('#f5e9b8'));
  });

  it('lightens a dark colour on a dark background', () => {
    const result = resolveBrandColor('#1a2a3a', DARK_BG);
    expect(result.adjusted).toBe(true);
    expect(contrastRatio(result.color, DARK_BG)).toBeGreaterThanOrEqual(BRAND_MIN_CONTRAST);
    expect(relativeLuminanceOf(result.color)).toBeGreaterThan(relativeLuminanceOf('#1a2a3a'));
  });

  it('always yields 3:1 against the background and 4.5:1 text on the colour', () => {
    for (const background of [LIGHT_BG, DARK_BG, '#faf7f5']) {
      for (let i = 0; i < 64; i += 1) {
        const hex = `#${[i * 4, (i * 37) % 256, (i * 91) % 256]
          .map((c) => c.toString(16).padStart(2, '0'))
          .join('')}`;
        const { color, foreground } = resolveBrandColor(hex, background);
        expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(BRAND_MIN_CONTRAST);
        expect(contrastRatio(color, foreground)).toBeGreaterThanOrEqual(BRAND_TEXT_MIN_CONTRAST);
      }
    }
  });
});

