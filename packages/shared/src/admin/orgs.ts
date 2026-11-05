import { z } from 'zod';

/** Mirrors the `org_status` database enum. */
export const adminOrgStatusSchema = z.enum([
  'trial',
  'active',
  'past_due',
  'suspended',
  'cancelled',
]);
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
    })
    .nullable(),
  branches: z.array(adminOrgBranchSchema),
});
export type AdminOrgDetail = z.infer<typeof adminOrgDetailSchema>;

export const adminOrgIdParamSchema = z.object({ id: z.uuid() });
