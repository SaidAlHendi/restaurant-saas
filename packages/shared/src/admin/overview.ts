import { z } from 'zod';

import { adminOrgStatusSchema } from './orgs.js';

/** Monthly recurring revenue in one currency, in minor units. */
export const adminOverviewMrrSchema = z.object({
  currency: z.string(),
  amountMinor: z.number().int(),
});

export const adminOverviewPlanMixItemSchema = z.object({
  planKey: z.string(),
  planName: z.string(),
  currency: z.string(),
  /** Live subscriptions (active or past_due) on this plan. */
  subscriptions: z.number().int(),
  mrrMinor: z.number().int(),
});

/** Platform KPIs for the admin overview page. */
export const adminOverviewSchema = z.object({
  generatedAt: z.iso.datetime(),
  /** Organization counts keyed by every status, zero when none. */
  orgsByStatus: z.record(adminOrgStatusSchema, z.number().int()),
  orgsTotal: z.number().int(),
  /** Subscriptions that are active or past_due. */
  activeSubscriptions: z.number().int(),
  trials: z.number().int(),
  mrr: z.array(adminOverviewMrrSchema),
  /** Subscriptions canceled in the last 30 days. */
  churned30d: z.number().int(),
  /** churned30d / (live now + churned30d); null when that base is zero. */
  churnRate30d: z.number().min(0).max(1).nullable(),
  planMix: z.array(adminOverviewPlanMixItemSchema),
  orders24h: z.number().int(),
  activeOrgs24h: z.number().int(),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminOverviewPlanMixItem = z.infer<typeof adminOverviewPlanMixItemSchema>;
