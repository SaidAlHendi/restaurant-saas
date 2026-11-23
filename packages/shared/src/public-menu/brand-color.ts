/** Brand colour maths for the public menu: contrast checks and automatic readable text. */

export const BRAND_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Minimum contrast of the brand colour against the menu background (non-text UI colour, WCAG 1.4.11). */
export const BRAND_MIN_CONTRAST = 3;
/** Minimum contrast of text drawn on the brand colour (WCAG AA for normal text). */
export const BRAND_TEXT_MIN_CONTRAST = 4.5;

type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function channelLuminance(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text colour for use on `color`: white, else near-black, else black; the first with 4.5:1. */
export function readableTextOn(color: string): string {
  for (const candidate of ['#ffffff', '#111111']) {
    if (contrastRatio(color, candidate) >= BRAND_TEXT_MIN_CONTRAST) {
      return candidate;
    }
  }
  return '#000000';
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

export type ResolvedBrandColor = {
  /** The colour to use: the owner's, or the nearest darker/lighter one that passes. */
  color: string;
  /** Readable text colour for use on `color` (4.5:1). */
  foreground: string;
  /** True when the owner's colour had to be darkened or lightened. */
  adjusted: boolean;
};

/**
 * Derives the menu's primary colours from the owner's brand colour. If it has less than 3:1
 * against `background`, it is darkened (light background) or lightened (dark background) in small
 * steps until it passes. Hue is kept as far as the mix toward black or white allows.
 */
export function resolveBrandColor(brand: string, background: string): ResolvedBrandColor {
  const start = brand.toLowerCase();
  if (contrastRatio(start, background) >= BRAND_MIN_CONTRAST) {
    return { color: start, foreground: readableTextOn(start), adjusted: false };
  }
  const target: Rgb = relativeLuminance(background) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  const from = hexToRgb(start);
  for (let step = 1; step <= 100; step += 1) {
    const candidate = rgbToHex(mix(from, target, step / 100));
    if (contrastRatio(candidate, background) >= BRAND_MIN_CONTRAST) {
      return { color: candidate, foreground: readableTextOn(candidate), adjusted: true };
    }
  }
  const limit = rgbToHex(target);
  return { color: limit, foreground: readableTextOn(limit), adjusted: true };
}
