import { z } from 'zod';

import { orgLocaleCodeSchema } from '../i18n/org-locales.js';
import { displayRoundingStepSchema, exchangeRateSchema } from '../money/display-currency.js';
import { DEFAULT_MENU_THEME, menuCoverUrlsSchema, menuThemeSchema } from '../public-menu/menu-theme.js';

function isKnownCurrencyCode(code: string): boolean {
  try {
    return Intl.supportedValuesOf('currency').includes(code);
  } catch {
    return /^[A-Z]{3}$/.test(code);
  }
}

export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .refine(isKnownCurrencyCode, 'Unknown currency code');

export const orgSettingsResponseSchema = z.object({
  name: z.string(),
  slug: z.string(),
  defaultCurrency: z.string().length(3),
  /** True once the restaurant has an order: the base currency can no longer be changed. */
  baseCurrencyLocked: z.boolean().default(true),
  defaultLocale: orgLocaleCodeSchema,
  locales: z.array(orgLocaleCodeSchema).min(1),
  logoUrl: z.url().nullable(),
  /** Currency shown to staff and guests; `null` = show the base currency (`defaultCurrency`). */
  displayCurrency: z.string().length(3).nullable(),
  /** Display-currency units for 1 base-currency unit; `null` until the owner sets it. */
  exchangeRate: exchangeRateSchema.nullable(),
  exchangeRateUpdatedAt: z.iso.datetime().nullable(),
  /** Rounding steps in whole display-currency units (0 = no rounding). */
  displayItemStep: displayRoundingStepSchema,
  displayTotalStep: displayRoundingStepSchema,
  /** Look of the public QR menu. Per organization, shared by all its branches. */
  menuTheme: menuThemeSchema.default(DEFAULT_MENU_THEME),
  /** Hero cover photo of the public menu; changed by the cover upload/delete endpoints, not by PATCH. */
  menuCoverUrls: menuCoverUrlsSchema.nullable().default(null),
  /** False on plans without `menu.branding`: only the default look is allowed and shown to guests. */
  menuLookAllowed: z.boolean().default(true),
});

export type OrgSettingsResponse = z.infer<typeof orgSettingsResponseSchema>;

export const patchOrgSettingsBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    locales: z.array(orgLocaleCodeSchema).min(1).optional(),
    defaultLocale: orgLocaleCodeSchema.optional(),
    /** Base currency. Only accepted while the restaurant has no orders; price numbers stay as typed. */
    defaultCurrency: currencyCodeSchema.optional(),
    /** `null` turns the display currency off. */
    displayCurrency: currencyCodeSchema.nullable().optional(),
    exchangeRate: exchangeRateSchema.optional(),
    displayItemStep: displayRoundingStepSchema.optional(),
    displayTotalStep: displayRoundingStepSchema.optional(),
    /** The whole theme, replaced on save. */
    menuTheme: menuThemeSchema.optional(),
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

export const orgMenuCoverUploadResponseSchema = z.object({
  menuCoverUrls: menuCoverUrlsSchema,
});

export type OrgMenuCoverUploadResponse = z.infer<typeof orgMenuCoverUploadResponseSchema>;

export const orgMenuCoverDeleteResponseSchema = z.object({
  menuCoverUrls: z.null(),
});

export type OrgMenuCoverDeleteResponse = z.infer<typeof orgMenuCoverDeleteResponseSchema>;
