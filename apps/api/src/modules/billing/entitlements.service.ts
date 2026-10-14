import { Inject, Injectable } from '@nestjs/common';

import { PLAN_IDS, type EntitlementsSnapshot, type PlanKey } from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg, type DrizzleTx } from '../../core/db/with-org';
import { ForbiddenError } from '../../core/errors/app-errors';

import { BillingRepository, type PlanFeatureRow, type SubscriptionWithPlanRow } from './billing.repository';
import { EntitlementsRawCache } from './entitlements-cache';
import { featuresAndLimitsFromRows } from './plan-features.util';
import { resolveEffectivePlan } from './resolve-effective-plan';

type RawEntitlementsPayload = {
  subscription: SubscriptionWithPlanRow | null;
  subscriptionPlanFeatures: PlanFeatureRow[];
  freePlanFeatures: PlanFeatureRow[];
};

@Injectable()
export class EntitlementsService {
  private readonly cache = new EntitlementsRawCache();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly billingRepo: BillingRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  invalidate(orgId: string): void {
    this.cache.invalidate(orgId);
  }

  async getEntitlements(orgId: string, tx?: DrizzleTx): Promise<EntitlementsSnapshot> {
    const raw = await this.loadRaw(orgId, tx);
    return this.snapshotFromRaw(raw);
  }

  async can(orgId: string, featureKey: string, tx?: DrizzleTx): Promise<boolean> {
    const snapshot = await this.getEntitlements(orgId, tx);
    return snapshot.features.includes(featureKey);
  }

  async assertFeature(orgId: string, featureKey: string, tx?: DrizzleTx): Promise<void> {
    const snapshot = await this.getEntitlements(orgId, tx);
    if (!snapshot.features.includes(featureKey)) {
      throw new ForbiddenError(
        'Plan feature not available',
        { feature: featureKey, planKey: snapshot.planKey },
        'PLAN_FEATURE_REQUIRED',
      );
    }
  }

  async assertWithinLimit(
    orgId: string,
    limitKey: string,
    nextValue: number,
    tx?: DrizzleTx,
  ): Promise<void> {
    const snapshot = await this.getEntitlements(orgId, tx);
    const max = snapshot.limits[limitKey];
    if (max === undefined || max === null) {
      return;
    }
    if (nextValue > max) {
      throw new ForbiddenError(
        'Plan limit reached',
        { limit: limitKey, max, planKey: snapshot.planKey },
        'PLAN_LIMIT_REACHED',
      );
    }
  }

  private async loadRaw(orgId: string, tx?: DrizzleTx): Promise<RawEntitlementsPayload> {
    const loadFromTx = async (useTx: DrizzleTx): Promise<RawEntitlementsPayload> => {
      const subscriptionRow = await this.billingRepo.findSubscriptionWithPlan(useTx, orgId);
      const subscription = subscriptionRow;
      const freePlanFeatures = await this.billingRepo.listPlanFeatures(useTx, PLAN_IDS.free);
      const subscriptionPlanFeatures =
        subscription !== null
          ? await this.billingRepo.listPlanFeatures(useTx, subscription.planId)
          : [];
      return { subscription, subscriptionPlanFeatures, freePlanFeatures };
    };

    if (tx !== undefined) {
      return loadFromTx(tx);
    }

    const nowMs = this.clock.now().getTime();
    const cached = this.cache.get(orgId, nowMs);
    if (cached !== undefined) {
      return {
        subscription: cached.subscription,
        subscriptionPlanFeatures: cached.subscriptionPlanFeatures,
        freePlanFeatures: cached.freePlanFeatures,
      };
    }

    const loaded = await withOrg(this.db, orgId, loadFromTx);
    this.cache.set(orgId, loaded, nowMs);
    return loaded;
  }

  private snapshotFromRaw(raw: RawEntitlementsPayload): EntitlementsSnapshot {
    const now = this.clock.now();
    const subRow = raw.subscription;
    const resolved = resolveEffectivePlan(
      subRow === null
        ? null
        : {
            planKey: subRow.planKey,
            status: subRow.status,
            provider: subRow.provider,
            trialEndsAt: subRow.trialEndsAt,
            currentPeriodEnd: subRow.currentPeriodEnd,
          },
      now,
    );

    const effectivePlanKey: PlanKey = resolved.planKey;
    const featureRows =
      effectivePlanKey === 'free' ? raw.freePlanFeatures : raw.subscriptionPlanFeatures;

    const { features, limits } = featuresAndLimitsFromRows(featureRows);

    return {
      planKey: effectivePlanKey,
      reason: resolved.reason,
      status: subRow?.status ?? null,
      trialEndsAt: subRow?.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: subRow?.currentPeriodEnd?.toISOString() ?? null,
      features,
      limits,
    };
  }
}
