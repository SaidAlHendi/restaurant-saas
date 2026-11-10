export const LANDING_LOCALES = ['ar', 'en'] as const;
export type LandingLocale = (typeof LANDING_LOCALES)[number];

/** Arabic is the primary language of the product and the default for unknown visitors. */
export const DEFAULT_LANDING_LOCALE: LandingLocale = 'ar';

export function isLandingLocale(value: string | undefined | null): value is LandingLocale {
  return value === 'ar' || value === 'en';
}

type WeightedLanguage = { tag: string; q: number };

function parseAcceptLanguage(header: string): WeightedLanguage[] {
  return header
    .split(',')
    .map((part) => {
      const [rawTag = '', ...params] = part.trim().split(';');
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const q = qParam === undefined ? 1 : Number.parseFloat(qParam.slice(2));
      return { tag: rawTag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag !== '' && entry.q > 0);
}

/**
 * Pick `ar` or `en` from an Accept-Language header. Arabic wins ties and wins whenever the
 * visitor lists neither language, because it is the default of the site.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): LandingLocale {
  if (!acceptLanguage) {
    return DEFAULT_LANDING_LOCALE;
  }
  let bestAr = 0;
  let bestEn = 0;
  for (const { tag, q } of parseAcceptLanguage(acceptLanguage)) {
    const base = tag.split('-')[0];
    if (base === 'ar') {
      bestAr = Math.max(bestAr, q);
    } else if (base === 'en') {
      bestEn = Math.max(bestEn, q);
    }
  }
  return bestEn > bestAr ? 'en' : 'ar';
}

export function otherLocale(locale: LandingLocale): LandingLocale {
  return locale === 'ar' ? 'en' : 'ar';
}

/** Path of a landing page: `/ar`, `/en/privacy`, ... */
export function landingPath(locale: LandingLocale, page?: 'privacy' | 'terms' | 'thanks'): string {
  return page === undefined ? `/${locale}` : `/${locale}/${page}`;
}
