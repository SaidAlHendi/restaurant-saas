import { asc, eq, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { PLAN_IDS, planKeySchema, type PlanKey } from '@app/shared';

import type { DrizzleTx } from '../../core/db/with-org';
import {
  billingEvents,
  planFeatures,
  plans,
  subscriptions,
} from '../../core/db/schema/billing';
import { organizations } from '../../core/db/schema/tenancy';
import { newUuidV7 } from '../../lib/uuid';

export type PlanFeatureRow = {
  featureKey: string;
  limitValue: number | null;
};

export type SubscriptionWithPlanRow = {
  id: string;
  orgId: string;
  planId: string;
  planKey: PlanKey;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  provider: 'paddle' | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  scheduledChange: Record<string, unknown> | null;
  providerEventAt: Date | null;
  branchQuantity: number;
  perBranch: boolean;
};

export type PublicPlanRow = {
  id: string;
  key: PlanKey;
  name: string;
  priceMinor: number;
  currency: string;
  interval: 'month';
  perBranch: boolean;
  sortOrder: number;
};

export type BillingEventRow = {
  id: string;
  providerEventId: string;
  type: string;
  occurredAt: Date;
  processedAt: Date | null;
  error: string | null;
};

function parseDateValue(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  throw new Error('Invalid date value from billing_events');
}

function parseBillingEventLockRow(raw: unknown): BillingEventRow | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = row['id'];
  const providerEventId = row['provider_event_id'];
  const type = row['type'];
  const occurredAt = row['occurred_at'];
  const processedAt = row['processed_at'];
  const error = row['error'];
  if (typeof id !== 'string' || typeof providerEventId !== 'string' || typeof type !== 'string') {
    return null;
  }
  if (occurredAt === undefined || occurredAt === null) {
    return null;
  }
  return {
    id,
    providerEventId,
    type,
    occurredAt: parseDateValue(occurredAt),
    processedAt: processedAt === null || processedAt === undefined ? null : parseDateValue(processedAt),
    error: typeof error === 'string' ? error : null,
  };
}

function asJsonObject(value: unknown): Record<string, unknown> | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export type SubscriptionUpdatePatch = {
  planId?: string;
  status?: 'trialing' | 'active' | 'past_due' | 'canceled';
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  provider?: 'paddle' | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  branchQuantity?: number;
  canceledAt?: Date | null;
  scheduledChange?: Record<string, unknown> | null;
  providerEventAt?: Date | null;
};

@Injectable()
export class BillingRepository {
  async findSubscriptionWithPlan(
    tx: DrizzleTx,
    orgId: string,
  ): Promise<SubscriptionWithPlanRow | null> {
    const rows = await tx
      .select({
        id: subscriptions.id,
        orgId: subscriptions.orgId,
        planId: subscriptions.planId,
        planKey: plans.key,
        status: subscriptions.status,
        provider: subscriptions.provider,
        providerCustomerId: subscriptions.providerCustomerId,
        providerSubscriptionId: subscriptions.providerSubscriptionId,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        canceledAt: subscriptions.canceledAt,
        scheduledChange: subscriptions.scheduledChange,
        providerEventAt: subscriptions.providerEventAt,
        branchQuantity: subscriptions.branchQuantity,
        perBranch: plans.perBranch,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.orgId, orgId))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    const planKey = planKeySchema.parse(row.planKey);
    const scheduled = asJsonObject(row.scheduledChange);
    return {
      id: row.id,
      orgId: row.orgId,
      planId: row.planId,
      planKey,
      status: row.status,
      provider: row.provider,
      providerCustomerId: row.providerCustomerId,
      providerSubscriptionId: row.providerSubscriptionId,
      trialEndsAt: row.trialEndsAt,
      currentPeriodEnd: row.currentPeriodEnd,
      canceledAt: row.canceledAt,
      scheduledChange: scheduled,
      providerEventAt: row.providerEventAt,
      branchQuantity: row.branchQuantity,
      perBranch: row.perBranch,
    };
  }

  async orgExists(tx: DrizzleTx, orgId: string): Promise<boolean> {
    const rows = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    return rows[0] !== undefined;
  }

  async listPublicPlans(tx: DrizzleTx): Promise<PublicPlanRow[]> {
    const rows = await tx
      .select({
        id: plans.id,
        key: plans.key,
        name: plans.name,
        priceMinor: plans.priceMinor,
        currency: plans.currency,
        interval: plans.interval,
        perBranch: plans.perBranch,
        sortOrder: plans.sortOrder,
      })
      .from(plans)
      .where(eq(plans.isPublic, true))
      .orderBy(asc(plans.sortOrder));
    return rows.map((row) => ({
      id: row.id,
      key: planKeySchema.parse(row.key),
      name: row.name,
      priceMinor: row.priceMinor,
      currency: row.currency,
      interval: 'month' as const,
      perBranch: row.perBranch,
      sortOrder: row.sortOrder,
    }));
  }

  async claimBillingEvent(
    tx: DrizzleTx,
    row: {
      providerEventId: string;
      type: string;
      occurredAt: Date;
      payload: unknown;
    },
  ): Promise<BillingEventRow> {
    await tx
      .insert(billingEvents)
      .values({
        id: newUuidV7(),
        provider: 'paddle',
        providerEventId: row.providerEventId,
        type: row.type,
        occurredAt: row.occurredAt,
        payload: row.payload,
      })
      .onConflictDoNothing({ target: billingEvents.providerEventId });

    const locked = await tx.execute(sql`
      SELECT id, provider_event_id, type, occurred_at, processed_at, error
      FROM billing_events
      WHERE provider_event_id = ${row.providerEventId}
      FOR UPDATE
    `);
    const raw = locked.rows[0];
    const claimed = parseBillingEventLockRow(raw);
    if (claimed === null) {
      throw new Error('billing_events claim failed');
    }
    return claimed;
  }

  async markBillingEventProcessed(
    tx: DrizzleTx,
    providerEventId: string,
    error: string | null,
    processedAt: Date,
  ): Promise<void> {
    const result = await tx
      .update(billingEvents)
      .set({
        processedAt,
        error,
      })
      .where(eq(billingEvents.providerEventId, providerEventId))
      .returning({ id: billingEvents.id });
    if (result[0] === undefined) {
      throw new Error('billing_events mark processed failed');
    }
  }

  async insertProcessedBillingEventWithError(
    tx: DrizzleTx,
    row: {
      providerEventId: string;
      type: string;
      occurredAt: Date;
      payload: unknown;
      error: string;
      processedAt: Date;
    },
  ): Promise<void> {
    await tx
      .insert(billingEvents)
      .values({
        id: newUuidV7(),
        provider: 'paddle',
        providerEventId: row.providerEventId,
        type: row.type,
        occurredAt: row.occurredAt,
        payload: row.payload,
        processedAt: row.processedAt,
        error: row.error,
      })
      .onConflictDoNothing({ target: billingEvents.providerEventId });
  }

  async listPlanFeatures(tx: DrizzleTx, planId: string): Promise<PlanFeatureRow[]> {
    const rows = await tx
      .select({
        featureKey: planFeatures.featureKey,
        limitValue: planFeatures.limitValue,
      })
      .from(planFeatures)
      .where(eq(planFeatures.planId, planId));
    return rows.map((r) => ({
      featureKey: r.featureKey,
      limitValue: r.limitValue,
    }));
  }

  async insertSubscription(
    tx: DrizzleTx,
    row: {
      id: string;
      orgId: string;
      planId: string;
      status: 'trialing' | 'active' | 'past_due' | 'canceled';
      trialEndsAt?: Date | null;
      provider?: 'paddle' | null;
      branchQuantity?: number;
    },
  ): Promise<void> {
    await tx.insert(subscriptions).values({
      id: row.id,
      orgId: row.orgId,
      planId: row.planId,
      status: row.status,
      trialEndsAt: row.trialEndsAt ?? null,
      provider: row.provider ?? null,
      branchQuantity: row.branchQuantity ?? 1,
    });
  }

  async updateSubscription(
    tx: DrizzleTx,
    orgId: string,
    patch: SubscriptionUpdatePatch,
  ): Promise<SubscriptionWithPlanRow> {
    const updated = await tx
      .update(subscriptions)
      .set({
        ...(patch.planId !== undefined ? { planId: patch.planId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.trialEndsAt !== undefined ? { trialEndsAt: patch.trialEndsAt } : {}),
        ...(patch.currentPeriodEnd !== undefined
          ? { currentPeriodEnd: patch.currentPeriodEnd }
          : {}),
        ...(patch.provider !== undefined ? { provider: patch.provider } : {}),
        ...(patch.providerCustomerId !== undefined
          ? { providerCustomerId: patch.providerCustomerId }
          : {}),
        ...(patch.providerSubscriptionId !== undefined
          ? { providerSubscriptionId: patch.providerSubscriptionId }
          : {}),
        ...(patch.branchQuantity !== undefined ? { branchQuantity: patch.branchQuantity } : {}),
        ...(patch.canceledAt !== undefined ? { canceledAt: patch.canceledAt } : {}),
        ...(patch.scheduledChange !== undefined ? { scheduledChange: patch.scheduledChange } : {}),
        ...(patch.providerEventAt !== undefined ? { providerEventAt: patch.providerEventAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.orgId, orgId))
      .returning({ id: subscriptions.id });
    if (updated[0] === undefined) {
      throw new Error('subscription update affected 0 rows');
    }
    const row = await this.findSubscriptionWithPlan(tx, orgId);
    if (row === null) {
      throw new Error('subscription update affected 0 rows');
    }
    return row;
  }

  async upsertCompBusinessSubscription(tx: DrizzleTx, orgId: string, id: string): Promise<void> {
    const existing = await this.findSubscriptionWithPlan(tx, orgId);
    if (existing !== null) {
      await tx
        .update(subscriptions)
        .set({
          planId: PLAN_IDS.business,
          status: 'active',
          provider: null,
          trialEndsAt: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.orgId, orgId));
      return;
    }
    await this.insertSubscription(tx, {
      id,
      orgId,
      planId: PLAN_IDS.business,
      status: 'active',
      provider: null,
    });
  }

}
