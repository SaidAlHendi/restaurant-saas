import { z } from 'zod';

import { planKeySchema } from './plan-key-schema.js';

export const entitlementReasonSchema = z.enum([
  'trial',
  'paid',
  'past_due',
  'trial_expired',
  'canceled',
  'comp',
  'none',
]);

export type EntitlementReason = z.infer<typeof entitlementReasonSchema>;

export const subscriptionStatusSchema = z.enum(['trialing', 'active', 'past_due', 'canceled']);

export const entitlementsSnapshotSchema = z.object({
  planKey: planKeySchema,
  reason: entitlementReasonSchema,
  status: subscriptionStatusSchema.nullable(),
  trialEndsAt: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  features: z.array(z.string()),
  limits: z.record(z.string(), z.number().nullable()),
});

export type EntitlementsSnapshot = z.infer<typeof entitlementsSnapshotSchema>;
