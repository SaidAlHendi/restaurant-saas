import { landingPath, type LandingLocale, type PageKey } from '../../lib/locale.js';
import type { LandingContent, NavKey, NavSectionId } from './content/types.js';
import { LANDING_IMAGES, type LandingImageName } from './landing-media.generated.js';

export type ImageFormat = 'avif' | 'webp' | 'jpg';

export function imageUrl(name: LandingImageName, width: number, format: ImageFormat): string {
  return `/landing/img/${name}-${String(width)}.${format}`;
}

/** `srcset` value for one format, e.g. `/landing/img/room-800.avif 800w, ...`. */
export function imageSrcSet(name: LandingImageName, format: ImageFormat): string {
  return LANDING_IMAGES[name].widths.map((w) => `${imageUrl(name, w, format)} ${String(w)}w`).join(', ');
}

/** Largest emitted JPEG, used as the `src` fallback for browsers without `srcset` support. */
export function imageFallbackSrc(name: LandingImageName): string {
  const widths = LANDING_IMAGES[name].widths;
  const largest = widths[widths.length - 1] ?? 0;
  return imageUrl(name, largest, 'jpg');
}

/** The product recordings show the Arabic interface, so both language versions of the page use them. */
const VIDEO_UI_LOCALE = 'ar';

/** Path of a product video in one of the formats we ship (WebM is smaller, MP4 covers older Safari). */
export function videoUrl(name: 'pos' | 'kds', format: 'webm' | 'mp4'): string {
  return `/landing/video/${name}-${VIDEO_UI_LOCALE}.${format}`;
}

const CURRENCY_MARK: Record<string, string> = { USD: '$' };

/**
 * Whole-unit price for the marketing page ("$39", or "٣٩ $" in Arabic). Transactions use
 * `formatMoney` with decimals; a pricing table reads better without ".00", and the Arabic locale
 * would otherwise print the long "US$" form.
 */
export function formatPlanPrice(minor: number, currency: string, locale: LandingLocale): string {
  const amount = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { maximumFractionDigits: 0 }).format(
    minor / 100,
  );
  const mark = CURRENCY_MARK[currency] ?? currency;
  return locale === 'ar' ? `${amount} ${mark}` : `${mark}${amount}`;
}

export function contactHref(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export type CurvePoint = { x: number; y: number };

/**
 * Smooth path that enters at the top centre, passes through the centre of every card and leaves
 * at the bottom centre. Pure geometry, so it works the same for RTL and LTR layouts.
 */
export function buildCurvePath(width: number, height: number, points: CurvePoint[]): string {
  const startX = width / 2;
  let prevX = startX;
  let prevY = -40;
  let d = `M ${String(startX)} ${String(prevY)}`;
  for (const { x, y } of points) {
    const half = (y - prevY) / 2;
    d += ` C ${String(prevX)} ${String(prevY + half)} ${String(x)} ${String(y - half)} ${String(x)} ${String(y)}`;
    prevX = x;
    prevY = y;
  }
  d += ` C ${String(prevX)} ${String(prevY + 160)} ${String(startX)} ${String(height)} ${String(startX)} ${String(height + 80)}`;
  return d;
}

/** How much of the line should be drawn: 0 before the section reaches 65% of the viewport, 1 at its end. */
export function curveProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const raw = (viewportHeight * 0.65 - sectionTop) / (sectionHeight + 80);
  return Math.min(1, Math.max(0, raw));
}

/** Which page is being rendered: the home page or one of the pages under `/:locale/`. */
export type CurrentPage = 'home' | PageKey;

const HOME_SECTION_KEYS: readonly NavKey[] = ['flow', 'kitchen'];

export function isSectionKey(key: NavKey): key is NavSectionId {
  return HOME_SECTION_KEYS.includes(key);
}

/** Sections scroll within the home page; everything else is a page of its own. */
export function navHref(locale: LandingLocale, key: NavKey, current: CurrentPage): string {
  if (isSectionKey(key)) {
    return current === 'home' ? `#${key}` : `${landingPath(locale)}#${key}`;
  }
  return landingPath(locale, key);
}

/** The same page in the other language (the language switch must not drop you on the home page). */
export function switchLocalePath(target: LandingLocale, current: CurrentPage): string {
  return current === 'home' ? landingPath(target) : landingPath(target, current);
}

export function buildPlanViews(plans: LandingContent['plans']['items'], locale: LandingLocale) {
  return plans.map((plan) => ({
    ...plan,
    price: formatPlanPrice(plan.priceMinor, plan.currency, locale),
  }));
}

export type PlanView = ReturnType<typeof buildPlanViews>[number];
