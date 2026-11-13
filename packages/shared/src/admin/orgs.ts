import { z } from 'zod';

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
  pageSize: z.coerce.number().int().min(1).max(ADMIN_ORG_PAGE_SIZE_MAX).default(20),
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
});

export const ADMIN_GRANT_PLAN_KEYS = ['menu', 'restaurant', 'business'] as const;

export const adminOrgDetailSchema = adminOrgListItemSchema.extend({
  defaultCurrency: z.string(),
  defaultLocale: z.string(),
  locales: z.array(z.string()),
  memberCount: z.number().int(),
  subscription: z
    .object({
      status: z.string(),
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
  grantablePlans: z.array(z.object({ key: z.enum(ADMIN_GRANT_PLAN_KEYS), currency: z.string() })),
  branches: z.array(adminOrgBranchSchema),
});
export type AdminOrgDetail = z.infer<typeof adminOrgDetailSchema>;

export const adminOrgIdParamSchema = z.object({ id: z.uuid() });

/** Result of suspend / reactivate: the organization's new status. */
export const adminOrgStatusChangeSchema = z.object({
  id: z.uuid(),
  status: adminOrgStatusSchema,
});
export type AdminOrgStatusChange = z.infer<typeof adminOrgStatusChangeSchema>;

/** Paid plans an admin can grant by hand (the free plan needs no grant). */
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
