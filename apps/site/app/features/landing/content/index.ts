import type { LandingLocale } from '../../../lib/locale.js';
import { landingAr } from './ar.js';
import { landingEn } from './en.js';
import type { LandingContent } from './types.js';

export function getLandingContent(locale: LandingLocale): LandingContent {
  return locale === 'ar' ? landingAr : landingEn;
}

export { getLegalContent, getThanksContent } from './legal.js';
export type * from './types.js';
