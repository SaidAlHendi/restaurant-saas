import type { PlanFeatureRow } from './billing.repository';
import type { SubscriptionWithPlanRow } from './billing.repository';

export type EntitlementsRawCacheEntry = {
  expiresAtMs: number;
  subscription: SubscriptionWithPlanRow | null;
  subscriptionPlanFeatures: PlanFeatureRow[];
  freePlanFeatures: PlanFeatureRow[];
};

const TTL_MS = 30_000;

export class EntitlementsRawCache {
  private readonly entries = new Map<string, EntitlementsRawCacheEntry>();

  get(orgId: string, nowMs: number): EntitlementsRawCacheEntry | undefined {
    const row = this.entries.get(orgId);
    if (row === undefined) {
      return undefined;
    }
    if (row.expiresAtMs <= nowMs) {
      this.entries.delete(orgId);
      return undefined;
    }
    return row;
  }

  set(orgId: string, value: Omit<EntitlementsRawCacheEntry, 'expiresAtMs'>, nowMs: number): void {
    this.entries.set(orgId, { ...value, expiresAtMs: nowMs + TTL_MS });
  }

  invalidate(orgId: string): void {
    this.entries.delete(orgId);
  }
}
