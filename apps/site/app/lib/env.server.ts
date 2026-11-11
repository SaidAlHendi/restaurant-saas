import { z } from 'zod';

import { parseSocialLinks, type SocialLinks } from './social.js';
import { parseWhatsappNumber } from './whatsapp.js';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const siteEnvSchema = z.object({
  PUBLIC_API_URL: z.url(),
  PUBLIC_SITE_URL: z.url(),
  /** Tracking IDs. All optional: with none set, no third-party script is ever loaded. */
  PUBLIC_GA4_ID: optionalId,
  PUBLIC_META_PIXEL_ID: optionalId,
  PUBLIC_GOOGLE_ADS_ID: optionalId,
});

export type SiteEnv = z.infer<typeof siteEnvSchema>;

let cached: SiteEnv | null = null;

export function getSiteEnv(): SiteEnv {
  if (cached === null) {
    cached = siteEnvSchema.parse({
      PUBLIC_API_URL: process.env.PUBLIC_API_URL,
      PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
      PUBLIC_GA4_ID: process.env.PUBLIC_GA4_ID,
      PUBLIC_META_PIXEL_ID: process.env.PUBLIC_META_PIXEL_ID,
      PUBLIC_GOOGLE_ADS_ID: process.env.PUBLIC_GOOGLE_ADS_ID,
    });
  }
  return cached;
}

/**
 * The business WhatsApp number (digits with country code). Read on its own, with no required-env
 * check, so a missing value falls back to the placeholder instead of breaking every page.
 */
export function getWhatsappNumber(): string {
  return parseWhatsappNumber(process.env['PUBLIC_WHATSAPP_NUMBER']);
}

/** Instagram and Facebook profile links. Like the WhatsApp number, a missing value never breaks a page. */
export function getSocialLinks(): SocialLinks {
  return parseSocialLinks({
    instagram: process.env['PUBLIC_INSTAGRAM_URL'],
    facebook: process.env['PUBLIC_FACEBOOK_URL'],
  });
}

/** Test-only reset. */
export function resetSiteEnvCacheForTests(): void {
  cached = null;
}
