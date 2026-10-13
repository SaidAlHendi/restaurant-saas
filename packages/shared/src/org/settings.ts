import { z } from 'zod';

import { orgLocaleCodeSchema } from '../i18n/org-locales.js';

export const orgSettingsResponseSchema = z.object({
  name: z.string(),
  slug: z.string(),
  defaultCurrency: z.string().length(3),
  defaultLocale: orgLocaleCodeSchema,
  locales: z.array(orgLocaleCodeSchema).min(1),
  logoUrl: z.url().nullable(),
});

export type OrgSettingsResponse = z.infer<typeof orgSettingsResponseSchema>;

export const patchOrgSettingsBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    locales: z.array(orgLocaleCodeSchema).min(1).optional(),
    defaultLocale: orgLocaleCodeSchema.optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.locales !== undefined) {
      const set = new Set(body.locales);
      if (set.size !== body.locales.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate locales',
          path: ['locales'],
        });
      }
    }
    const locales = body.locales;
    const defaultLocale = body.defaultLocale;
    if (defaultLocale !== undefined && locales !== undefined && !locales.includes(defaultLocale)) {
      ctx.addIssue({
        code: 'custom',
        message: 'defaultLocale must be included in locales',
        path: ['defaultLocale'],
      });
    }
  });

export type PatchOrgSettingsBody = z.infer<typeof patchOrgSettingsBodySchema>;

export const orgLogoUploadResponseSchema = z.object({
  logoUrl: z.url(),
});

export type OrgLogoUploadResponse = z.infer<typeof orgLogoUploadResponseSchema>;

export const orgLogoDeleteResponseSchema = z.object({
  logoUrl: z.null(),
});

export type OrgLogoDeleteResponse = z.infer<typeof orgLogoDeleteResponseSchema>;
