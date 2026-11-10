/**
 * Public tracking IDs from the environment. They are optional: with none set, no third-party
 * script is ever loaded. IDs are validated by format because they end up in script URLs.
 */
export type TrackingIds = {
  ga4: string | null;
  metaPixel: string | null;
  googleAds: string | null;
};

const GA4_PATTERN = /^G-[A-Z0-9]{4,20}$/;
const GOOGLE_ADS_PATTERN = /^AW-\d{6,20}$/;
const META_PIXEL_PATTERN = /^\d{8,20}$/;

function validOrNull(value: string | undefined, pattern: RegExp): string | null {
  const trimmed = value?.trim();
  return trimmed !== undefined && pattern.test(trimmed) ? trimmed : null;
}

export function parseTrackingIds(raw: {
  ga4?: string;
  metaPixel?: string;
  googleAds?: string;
}): TrackingIds {
  return {
    ga4: validOrNull(raw.ga4, GA4_PATTERN),
    metaPixel: validOrNull(raw.metaPixel, META_PIXEL_PATTERN),
    googleAds: validOrNull(raw.googleAds, GOOGLE_ADS_PATTERN),
  };
}

export function hasTracking(ids: TrackingIds): boolean {
  return ids.ga4 !== null || ids.metaPixel !== null || ids.googleAds !== null;
}

/** Ids handled by gtag.js (GA4 and Google Ads share one loader). */
export function gtagIds(ids: TrackingIds): string[] {
  return [ids.ga4, ids.googleAds].filter((id): id is string => id !== null);
}

export function gtagScriptUrl(firstId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(firstId)}`;
}
