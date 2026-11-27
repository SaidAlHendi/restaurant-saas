import { z } from 'zod';

import { DEFAULT_PAGE_SIZE } from '../page-pagination.js';

/** Mirrors the `org_status` database enum. */
export const ADMIN_ORG_STATUSES = [
  'trial',
  'active',
  'past_due',
  'suspended',
  'cancelled',
] as const;
export const adminOrgStatusSchema = z.enum(ADMIN_ORG_STATUSES);
export type AdminOrgStatus = z.infer<typeof adminOrgStatusSchema>;

export const ADMIN_ORG_PAGE_SIZE_MAX = 100;

export const adminOrgListQuerySchema = z.object({
  /** Matches restaurant name or slug (case-insensitive, partial). */
  q: z.string().trim().max(120).optional(),
  status: adminOrgStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(ADMIN_ORG_PAGE_SIZE_MAX).default(DEFAULT_PAGE_SIZE),
});
export type AdminOrgListQuery = z.infer<typeof adminOrgListQuerySchema>;

export const adminOrgListItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  status: adminOrgStatusSchema,
  country: z.string(),
  planKey: z.string().nullable(),
  planName: z.string().nullable(),
  ownerName: z.string().nullable(),
  ownerEmail: z.string().nullable(),
  branchCount: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type AdminOrgListItem = z.infer<typeof adminOrgListItemSchema>;

export const adminOrgListResponseSchema = z.object({
  items: z.array(adminOrgListItemSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type AdminOrgListResponse = z.infer<typeof adminOrgListResponseSchema>;

export const adminOrgBranchSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  isActive: z.boolean(),
  address: z.string().nullable(),
  timezone: z.string(),
  currency: z.string(),
  /** Tax rate in basis points (1500 = 15%). */
  taxRateBp: z.number().int(),
  taxInclusive: z.boolean(),
  dayStartHour: z.number().int(),
  payBeforeSend: z.boolean(),
  acceptsCard: z.boolean(),
  pagerEnabled: z.boolean(),
  supportsDineIn: z.boolean(),
  supportsTakeaway: z.boolean(),
  createdAt: z.iso.datetime(),
  /** Active dining tables. */
  tableCount: z.number().int(),
  devices: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      status: z.enum(['pending', 'active', 'revoked']),
      lastUsedAt: z.iso.datetime().nullable(),
    }),
  ),
  ordersLast30Days: z.number().int(),
  lastOrderAt: z.iso.datetime().nullable(),
});
export type AdminOrgBranch = z.infer<typeof adminOrgBranchSchema>;

export const adminOrgMemberSchema = z.object({
  membershipId: z.uuid(),
  name: z.string(),
  email: z.string().nullable(),
  roleKey: z.string(),
  roleName: z.string(),
  status: z.enum(['active', 'invited', 'disabled']),
  lastLoginAt: z.iso.datetime().nullable(),
  allBranches: z.boolean(),
  /** Only filled when `allBranches` is false. */
  branchNames: z.array(z.string()),
});
export type AdminOrgMember = z.infer<typeof adminOrgMemberSchema>;

/** How many admin actions the restaurant page shows. */
export const ADMIN_ORG_HISTORY_LIMIT = 20;

/** Paid plans an admin can grant by hand (the free plan needs no grant). */
export const ADMIN_GRANT_PLAN_KEYS = ['menu', 'restaurant', 'business'] as const;

export const adminOrgDetailSchema = adminOrgListItemSchema.extend({
  defaultCurrency: z.string(),
  defaultLocale: z.string(),
  locales: z.array(z.string()),
  memberCount: z.number().int(),
  subscription: z
    .object({
      status: z.string(),
      /** Billing provider; null = manual or free. */
      provider: z.string().nullable(),
      branchQuantity: z.number().int(),
      trialEndsAt: z.iso.datetime().nullable(),
      currentPeriodEnd: z.iso.datetime().nullable(),
      canceledAt: z.iso.datetime().nullable(),
      /** Manual activation only (provider null); null when the grant was never recorded. */
      manualPaid: z.boolean().nullable(),
      manualAmountMinor: z.number().int().nullable(),
      manualNote: z.string().nullable(),
    })
    .nullable(),
  /** Currency of each plan an admin can grant, so the payment amount is entered in the right one. */
  grantablePlans: z.array(
    z.object({ key: z.enum(ADMIN_GRANT_PLAN_KEYS), name: z.string(), currency: z.string() }),
  ),
  branches: z.array(adminOrgBranchSchema),
  displayCurrency: z.string().nullable(),
  exchangeRate: z.number().nullable(),
  planDetail: z
    .object({
      priceMinor: z.number().int(),
      currency: z.string(),
      perBranch: z.boolean(),
      features: z.array(z.object({ key: z.string(), limit: z.number().int().nullable() })),
    })
    .nullable(),
  /** Orders that count as sales (drafts and cancelled orders are left out). */
  orderStats: z.object({
    total: z.number().int(),
    last30Days: z.number().int(),
    lastOrderAt: z.iso.datetime().nullable(),
    /** One entry per order currency; amounts in minor units. */
    salesLast30Days: z.array(z.object({ currency: z.string(), amountMinor: z.number().int() })),
  }),
  catalog: z.object({ categoryCount: z.number().int(), productCount: z.number().int() }),
  team: z.array(adminOrgMemberSchema),
  /** Latest admin actions on this restaurant, newest first. */
  history: z.array(
    z.object({
      id: z.uuid(),
      createdAt: z.iso.datetime(),
      action: z.string(),
      actorName: z.string(),
    }),
  ),
});
export type AdminOrgDetail = z.infer<typeof adminOrgDetailSchema>;

export const adminOrgIdParamSchema = z.object({ id: z.uuid() });

/** Result of suspend / reactivate: the organization's new status. */
export const adminOrgStatusChangeSchema = z.object({
  id: z.uuid(),
  status: adminOrgStatusSchema,
});
export type AdminOrgStatusChange = z.infer<typeof adminOrgStatusChangeSchema>;

/**
 * Manual activation: the plan stays active until `until`, then the restaurant falls back to free.
 * `paid` says whether money was received; `amountMinor` (plan currency, minor units) is required then
 * and must be 0 or absent when nothing was paid.
 */
export const adminOrgActivateSchema = z
  .object({
    planKey: z.enum(ADMIN_GRANT_PLAN_KEYS),
    until: z.iso.datetime(),
    paid: z.boolean(),
    amountMinor: z.number().int().min(0).optional(),
    note: z.string().trim().max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.paid && value.amountMinor === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['amountMinor'],
        message: 'Amount is required when paid',
      });
    }
    if (!value.paid && value.amountMinor !== undefined && value.amountMinor !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amountMinor'],
        message: 'Amount must be 0 when not paid',
      });
    }
  });
export type AdminOrgActivateInput = z.infer<typeof adminOrgActivateSchema>;

export const adminOrgActivateResultSchema = z.object({
  id: z.uuid(),
  planKey: z.enum(ADMIN_GRANT_PLAN_KEYS),
  currentPeriodEnd: z.iso.datetime(),
});
export type AdminOrgActivateResult = z.infer<typeof adminOrgActivateResultSchema>;
