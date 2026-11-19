import { z } from 'zod';

import { moneyMinorSchema } from '../i18n/localized-text.js';
import { moneyDisplaySchema } from '../money/display-currency.js';

const localizedTextSchema = z.record(z.string(), z.string());

export const posMenuBranchSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  currency: z.string().length(3),
  taxRateBp: z.number().int(),
  taxInclusive: z.boolean(),
  timezone: z.string(),
  receiptHeader: z.string().nullable(),
  receiptFooter: z.string().nullable(),
  address: z.string().nullable(),
  payBeforeSend: z.boolean(),
  acceptsCard: z.boolean(),
  /** Branch setting AND the plan includes `ordering.pager`. */
  pagerEnabled: z.boolean(),
});

export const posMenuOrgSchema = z.object({
  name: z.string(),
  logoUrl: z.url().nullable(),
});

export const posMenuModifierSchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  priceDeltaMinor: moneyMinorSchema,
  sortOrder: z.number().int(),
});

export const posMenuModifierGroupSchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  minSelect: z.number().int(),
  maxSelect: z.number().int(),
  sort: z.number().int(),
  modifiers: z.array(posMenuModifierSchema),
});

export const posMenuProductSchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  priceMinor: moneyMinorSchema,
  imageUrl400: z.url().nullable(),
  sortOrder: z.number().int(),
  modifierGroups: z.array(posMenuModifierGroupSchema),
});

export const posMenuCategorySchema = z.object({
  id: z.uuid(),
  name: localizedTextSchema,
  sortOrder: z.number().int(),
  products: z.array(posMenuProductSchema),
});

export const posMenuPayloadSchema = z.object({
  branch: posMenuBranchSchema,
  org: posMenuOrgSchema,
  categories: z.array(posMenuCategorySchema),
  /** Set when the restaurant shows prices in another currency; prices above stay in `branch.currency`. */
  display: moneyDisplaySchema.nullable(),
  /** When the owner last set the exchange rate; `null` without a display currency. */
  displayRateUpdatedAt: z.iso.datetime().nullable(),
});

export type PosMenuPayload = z.infer<typeof posMenuPayloadSchema>;
