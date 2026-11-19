import { z } from 'zod';

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII, so `٠٥٠ ١٢٣` passes the phone check. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export const leadLocaleSchema = z.enum(['ar', 'en']);

/** ISO 3166-1 alpha-2, upper case. `ZZ` is used for "another country". */
export const leadCountrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Use a two-letter country code');

export const leadPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeDigits)
  .pipe(
    z
      .string()
      .min(6)
      .max(24)
      .regex(/^\+?[0-9][0-9 ()-]*[0-9]$/, 'Use digits, spaces, + and -'),
  );

const attributionValue = z.string().trim().max(200).optional();

/** First-touch campaign data kept by the site for the session (utm_*, ad click ids, referrer). */
export const leadAttributionSchema = z.object({
  utm_source: attributionValue,
  utm_medium: attributionValue,
  utm_campaign: attributionValue,
  utm_term: attributionValue,
  utm_content: attributionValue,
  gclid: attributionValue,
  fbclid: attributionValue,
  referrer: attributionValue,
  landingPath: attributionValue,
});

export type LeadAttribution = z.infer<typeof leadAttributionSchema>;

export const leadCreateBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  restaurantName: z.string().trim().min(2).max(120),
  phone: leadPhoneSchema,
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  country: leadCountrySchema,
  branches: z.number().int().min(1).max(999),
  locale: leadLocaleSchema,
  message: z.string().trim().max(1000).optional(),
  attribution: leadAttributionSchema.optional(),
  /** Honeypot: real visitors never see this field, so any value means a bot. */
  website: z.string().max(200).optional(),
});

export type LeadCreateBody = z.infer<typeof leadCreateBodySchema>;

export const leadCreateResponseSchema = z.object({ ok: z.literal(true) });
export type LeadCreateResponse = z.infer<typeof leadCreateResponseSchema>;
