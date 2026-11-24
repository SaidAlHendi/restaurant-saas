import { z } from 'zod';

import { pagedListQuerySchema, pageMetaShape } from '../page-pagination.js';
import { adminRoleSchema } from './roles.js';

// ---- Users ----

export const adminUserListQuerySchema = pagedListQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminTenantUserMembershipSchema = z.object({
  orgId: z.uuid(),
  orgName: z.string(),
  roleKey: z.string(),
  roleName: z.string(),
  status: z.string(),
});

export const adminTenantUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string().nullable(),
  createdAt: z.iso.datetime(),
  lastLoginAt: z.iso.datetime().nullable(),
  memberships: z.array(adminTenantUserMembershipSchema),
});
export type AdminTenantUser = z.infer<typeof adminTenantUserSchema>;

export const adminUserListResponseSchema = z.object({
  items: z.array(adminTenantUserSchema),
  ...pageMetaShape,
});
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;

// ---- Subscriptions ----

export const adminSubscriptionStatusSchema = z.enum(['trialing', 'active', 'past_due', 'canceled']);
export type AdminSubscriptionStatus = z.infer<typeof adminSubscriptionStatusSchema>;

export const ADMIN_TRIAL_ENDING_DAYS = 7;

export const adminSubscriptionListQuerySchema = z.object({
  status: adminSubscriptionStatusSchema.optional(),
  /** Plan key, e.g. `restaurant`. */
  plan: z.string().trim().min(1).max(60).optional(),
  /** Only trials that end within the next 7 days. */
  trialEnding: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
export type AdminSubscriptionListQuery = z.infer<typeof adminSubscriptionListQuerySchema>;

export const adminSubscriptionItemSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  orgName: z.string(),
  planKey: z.string(),
  planName: z.string(),
  status: adminSubscriptionStatusSchema,
  trialEndsAt: z.iso.datetime().nullable(),
  currentPeriodEnd: z.iso.datetime().nullable(),
  providerSubscriptionId: z.string().nullable(),
});
export type AdminSubscriptionItem = z.infer<typeof adminSubscriptionItemSchema>;

export const adminSubscriptionListResponseSchema = z.object({
  items: z.array(adminSubscriptionItemSchema),
});
export type AdminSubscriptionListResponse = z.infer<typeof adminSubscriptionListResponseSchema>;

// ---- Plans ----

export const adminPlanSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  priceMinor: z.number().int(),
  currency: z.string(),
  interval: z.string(),
  perBranch: z.boolean(),
  isPublic: z.boolean(),
  features: z.array(z.object({ key: z.string(), limit: z.number().int().nullable() })),
});
export type AdminPlan = z.infer<typeof adminPlanSchema>;

export const adminPlanListResponseSchema = z.object({ items: z.array(adminPlanSchema), ...pageMetaShape });
export type AdminPlanListResponse = z.infer<typeof adminPlanListResponseSchema>;

// ---- Audit log ----

export const adminAuditListQuerySchema = pagedListQuerySchema.extend({
  /** Matches the acting admin's email or name (partial). */
  actor: z.string().trim().max(120).optional(),
  /** Matches the action name (partial), e.g. `org.suspend`. */
  action: z.string().trim().max(120).optional(),
});
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;

export const adminAuditItemSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  actorId: z.uuid(),
  actorName: z.string(),
  actorEmail: z.string(),
  actorRole: adminRoleSchema,
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  orgId: z.string().nullable(),
  ip: z.string().nullable(),
});
export type AdminAuditItem = z.infer<typeof adminAuditItemSchema>;

export const adminAuditListResponseSchema = z.object({
  items: z.array(adminAuditItemSchema),
  ...pageMetaShape,
});
export type AdminAuditListResponse = z.infer<typeof adminAuditListResponseSchema>;
