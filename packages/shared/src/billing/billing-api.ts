import { z } from 'zod';

import { entitlementsSnapshotSchema } from './entitlements.js';
import { planKeySchema } from './plan-key-schema.js';

export const billingCheckoutBodySchema = z.object({
  planKey: planKeySchema,
});
export type BillingCheckoutBody = z.infer<typeof billingCheckoutBodySchema>;

export const billingCheckoutResponseSchema = z.object({
  priceId: z.string().min(1),
  quantity: z.number().int().positive(),
  customData: z.object({ orgId: z.uuid() }),
  customerEmail: z.email(),
  customerId: z.string().min(1).optional(),
});
export type BillingCheckoutResponse = z.infer<typeof billingCheckoutResponseSchema>;

export const billingChangePlanBodySchema = z.object({
  planKey: planKeySchema,
});
export type BillingChangePlanBody = z.infer<typeof billingChangePlanBodySchema>;

export const billingChangePlanResponseSchema = z.object({
  ok: z.literal(true),
});
export type BillingChangePlanResponse = z.infer<typeof billingChangePlanResponseSchema>;

export const billingPortalResponseSchema = z.object({
  url: z.url(),
});
export type BillingPortalResponse = z.infer<typeof billingPortalResponseSchema>;

export const billingPlanListItemSchema = z.object({
  key: planKeySchema,
  name: z.string(),
  priceMinor: z.number().int().nonnegative(),
  currency: z.literal('USD'),
  interval: z.literal('month'),
  perBranch: z.boolean(),
  sortOrder: z.number().int(),
  features: z.array(z.string()),
  limits: z.record(z.string(), z.number().nullable()),
  paddlePriceId: z.string().nullable(),
});

export const billingSubscriptionSnapshotSchema = z.object({
  provider: z.literal('paddle').nullable(),
  providerCustomerId: z.string().nullable(),
  providerSubscriptionId: z.string().nullable(),
  branchQuantity: z.number().int().positive(),
  canceledAt: z.string().nullable(),
  scheduledChange: z.unknown().nullable(),
});

export const billingOverviewResponseSchema = z.object({
  entitlements: entitlementsSnapshotSchema,
  subscription: billingSubscriptionSnapshotSchema.nullable(),
  checkoutEnabled: z.boolean(),
  plans: z.array(billingPlanListItemSchema),
});
export type BillingOverviewResponse = z.infer<typeof billingOverviewResponseSchema>;
