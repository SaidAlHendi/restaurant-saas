import { Inject, Injectable } from '@nestjs/common';

import { PLAN_IDS } from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg, type DrizzleTx } from '../../core/db/with-org';
import { newUuidV7 } from '../../lib/uuid';

import { BillingRepository, type SubscriptionUpdatePatch } from './billing.repository';
import { EntitlementsService } from './entitlements.service';

const TRIAL_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly billingRepo: BillingRepository,
    private readonly entitlements: EntitlementsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createTrialSubscription(tx: DrizzleTx, orgId: string): Promise<void> {
    const trialEndsAt = new Date(this.clock.now().getTime() + TRIAL_DAYS_MS);
    await this.billingRepo.insertSubscription(tx, {
      id: newUuidV7(),
      orgId,
      planId: PLAN_IDS.restaurant,
      status: 'trialing',
      trialEndsAt,
      provider: null,
    });
  }

  /** Used by webhooks (2b) and tests; clears entitlements cache after commit. */
  async applySubscriptionPatch(orgId: string, patch: SubscriptionUpdatePatch): Promise<void> {
    await withOrg(this.db, orgId, async (tx) => {
      await this.billingRepo.updateSubscription(tx, orgId, patch);
    });
    this.entitlements.invalidate(orgId);
  }
}
