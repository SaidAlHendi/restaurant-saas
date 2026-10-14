import { eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { PLAN_IDS, type PlanKey } from '@app/shared';

import type { DrizzleTx } from '../../core/db/with-org';
import { planFeatures, plans, subscriptions } from '../../core/db/schema/billing';

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
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  branchQuantity: number;
};

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
  scheduledChange?: unknown | null;
  providerEventAt?: Date | null;
};

@Injectable()
export class BillingRepository {
  async findSubscriptionWithPlan(
    tx: DrizzleTx,
    orgId: string,
  ): Promise<SubscriptionWithPlanRow | undefined> {
    const rows = await tx
      .select({
        id: subscriptions.id,
        orgId: subscriptions.orgId,
        planId: subscriptions.planId,
        planKey: plans.key,
        status: subscriptions.status,
        provider: subscriptions.provider,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        branchQuantity: subscriptions.branchQuantity,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.orgId, orgId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return undefined;
    }
    return {
      id: row.id,
      orgId: row.orgId,
      planId: row.planId,
      planKey: row.planKey as PlanKey,
      status: row.status,
      provider: row.provider,
      trialEndsAt: row.trialEndsAt,
      currentPeriodEnd: row.currentPeriodEnd,
      branchQuantity: row.branchQuantity,
    };
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
  ): Promise<SubscriptionWithPlanRow | undefined> {
    await tx
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
      .where(eq(subscriptions.orgId, orgId));
    return this.findSubscriptionWithPlan(tx, orgId);
  }

  async upsertCompBusinessSubscription(tx: DrizzleTx, orgId: string, id: string): Promise<void> {
    const existing = await this.findSubscriptionWithPlan(tx, orgId);
    if (existing) {
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

  static freePlanId(): string {
    return PLAN_IDS.free;
  }
}
