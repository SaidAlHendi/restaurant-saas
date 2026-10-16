import { Inject, Injectable, Logger } from '@nestjs/common';

import type {
  BillingChangePlanBody,
  BillingCheckoutBody,
  BillingCheckoutResponse,
  BillingOverviewResponse,
} from '@app/shared';

import { ENV, type Env } from '../../config/config.module';
import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { withOrg, type DrizzleTx } from '../../core/db/with-org';
import {
  BadGatewayError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../core/errors/app-errors';
import { IdentityService } from '../identity/identity.service';
import { OrgSettingsService } from '../tenancy/org-settings.service';

import { BillingRepository } from './billing.repository';
import { signCheckoutOrgId } from './checkout-org-signature';
import { EntitlementsService } from './entitlements.service';
import { isLivePaddleSubscription } from './is-live-paddle-subscription';
import {
  PaddleProviderError,
  type PaddleClient,
  type PaddleUpdateSubscriptionBody,
} from './paddle-client';
import {
  isCheckoutEnabled,
  paddlePriceMapFromEnv,
  priceIdForPlanKey,
} from './paddle-price-map';
import { PADDLE_CLIENT } from './paddle.tokens';
import { featuresAndLimitsFromRows } from './plan-features.util';

type ChangePlanAction =
  | { kind: 'cancel'; subscriptionId: string }
  | { kind: 'update'; subscriptionId: string; body: PaddleUpdateSubscriptionBody };

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(PADDLE_CLIENT) private readonly paddle: PaddleClient,
    private readonly billingRepo: BillingRepository,
    private readonly entitlements: EntitlementsService,
    private readonly orgSettings: OrgSettingsService,
    private readonly identity: IdentityService,
  ) {}

  async getOverview(ctx: RequestContext): Promise<BillingOverviewResponse> {
    const priceMap = paddlePriceMapFromEnv(this.env);
    const checkoutEnabled = isCheckoutEnabled(this.env);

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const entitlements = await this.entitlements.getEntitlements(ctx.orgId, tx);
      const sub = await this.billingRepo.findSubscriptionWithPlan(tx, ctx.orgId);
      const planRows = await this.billingRepo.listPublicPlans(tx);
      const plans: BillingOverviewResponse['plans'] = [];
      for (const plan of planRows) {
        const featureRows = await this.billingRepo.listPlanFeatures(tx, plan.id);
        const { features, limits } = featuresAndLimitsFromRows(featureRows);
        const paddlePriceId =
          plan.key === 'free' ? null : priceIdForPlanKey(priceMap, plan.key);
        plans.push({
          key: plan.key,
          name: plan.name,
          priceMinor: plan.priceMinor,
          currency: 'USD' as const,
          interval: 'month' as const,
          perBranch: plan.perBranch,
          sortOrder: plan.sortOrder,
          features,
          limits,
          paddlePriceId: checkoutEnabled ? paddlePriceId : null,
        });
      }

      return {
        entitlements,
        subscription:
          sub === null
            ? null
            : {
                provider: sub.provider,
                providerCustomerId: sub.providerCustomerId,
                providerSubscriptionId: sub.providerSubscriptionId,
                branchQuantity: sub.branchQuantity,
                canceledAt: sub.canceledAt?.toISOString() ?? null,
                scheduledChange: sub.scheduledChange,
              },
        checkoutEnabled,
        plans,
      };
    });
  }

  async checkout(
    ctx: RequestContext,
    body: BillingCheckoutBody,
  ): Promise<BillingCheckoutResponse> {
    if (!isCheckoutEnabled(this.env)) {
      throw new ValidationError('Checkout is not configured');
    }
    if (body.planKey === 'free') {
      throw new ValidationError('Cannot checkout the free plan');
    }

    const priceMap = paddlePriceMapFromEnv(this.env);
    const priceId = priceIdForPlanKey(priceMap, body.planKey);
    if (priceId === null) {
      throw new ValidationError('Plan price is not configured');
    }

    return withOrg(this.db, ctx.orgId, async (tx) => {
      const sub = await this.billingRepo.findSubscriptionWithPlan(tx, ctx.orgId);
      const now = this.clock.now();
      if (sub !== null && isLivePaddleSubscription(sub, now)) {
        throw new ConflictError(
          'Use change-plan for an existing Paddle subscription',
          {},
          'BILLING_USE_CHANGE_PLAN',
        );
      }

      const entitlements = await this.entitlements.getEntitlements(ctx.orgId, tx);
      if (
        entitlements.planKey === body.planKey &&
        (entitlements.reason === 'paid' || entitlements.reason === 'comp')
      ) {
        throw new ConflictError('Already on this plan');
      }

      const quantity = await this.quantityForPlan(tx, ctx.orgId, body.planKey);

      const email = await this.identity.getUserEmail(tx, ctx.userId);
      if (email === null) {
        throw new ValidationError('Owner email is required for checkout');
      }

      const response: BillingCheckoutResponse = {
        priceId,
        quantity,
        customData: {
          orgId: ctx.orgId,
          orgSig: signCheckoutOrgId(this.env.JWT_ACCESS_SECRET, ctx.orgId),
        },
        customerEmail: email,
      };
      if (sub?.providerCustomerId) {
        response.customerId = sub.providerCustomerId;
      }
      return response;
    });
  }

  async changePlan(ctx: RequestContext, body: BillingChangePlanBody): Promise<{ ok: true }> {
    if (!isCheckoutEnabled(this.env)) {
      throw new ValidationError('Billing provider is not configured');
    }

    const priceMap = paddlePriceMapFromEnv(this.env);

    // Read and validate inside the transaction; call Paddle only after it has finished.
    const action = await withOrg(this.db, ctx.orgId, async (tx): Promise<ChangePlanAction> => {
      const sub = await this.billingRepo.findSubscriptionWithPlan(tx, ctx.orgId);
      const now = this.clock.now();
      if (
        sub === null ||
        sub.providerSubscriptionId === null ||
        !isLivePaddleSubscription(sub, now)
      ) {
        throw new ConflictError('No live Paddle subscription', {}, 'BILLING_NO_SUBSCRIPTION');
      }
      const subscriptionId = sub.providerSubscriptionId;

      if (body.planKey === sub.planKey) {
        if (sub.scheduledChange === null) {
          throw new ConflictError('Already on this plan');
        }
        // Same plan with a pending change (e.g. scheduled cancel): only remove that change.
        return { kind: 'update', subscriptionId, body: { scheduled_change: null } };
      }

      if (body.planKey === 'free') {
        return { kind: 'cancel', subscriptionId };
      }

      const priceId = priceIdForPlanKey(priceMap, body.planKey);
      if (priceId === null) {
        throw new ValidationError('Plan price is not configured');
      }
      const quantity = await this.quantityForPlan(tx, ctx.orgId, body.planKey);
      const patchBody: PaddleUpdateSubscriptionBody = {
        items: [{ price_id: priceId, quantity }],
        proration_billing_mode: 'prorated_immediately',
        ...(sub.scheduledChange !== null ? { scheduled_change: null } : {}),
      };
      return { kind: 'update', subscriptionId, body: patchBody };
    });

    try {
      if (action.kind === 'cancel') {
        await this.paddle.cancelSubscriptionAtPeriodEnd(action.subscriptionId, {
          effective_from: 'next_billing_period',
        });
      } else {
        await this.paddle.updateSubscription(action.subscriptionId, action.body);
      }
    } catch (err: unknown) {
      this.rethrowProvider(err);
    }

    return { ok: true };
  }

  async portal(ctx: RequestContext): Promise<{ url: string }> {
    if (!isCheckoutEnabled(this.env)) {
      throw new ValidationError('Billing provider is not configured');
    }

    const customerId = await withOrg(this.db, ctx.orgId, async (tx) => {
      const sub = await this.billingRepo.findSubscriptionWithPlan(tx, ctx.orgId);
      if (sub === null || sub.providerCustomerId === null) {
        throw new ConflictError('No Paddle customer for portal', {}, 'BILLING_NO_SUBSCRIPTION');
      }
      return sub.providerCustomerId;
    });

    try {
      return await this.paddle.createCustomerPortalSession(customerId);
    } catch (err: unknown) {
      this.rethrowProvider(err);
    }
  }

  /**
   * Single-price plans (free, menu) cover one active branch; per-branch plans pay for each
   * active branch, so they may add more. Call before creating or reactivating a branch.
   */
  async assertCanActivateBranch(tx: DrizzleTx, orgId: string): Promise<void> {
    const entitlements = await this.entitlements.getEntitlements(orgId, tx);
    const planRows = await this.billingRepo.listPublicPlans(tx);
    const plan = planRows.find((p) => p.key === entitlements.planKey);
    if (plan?.perBranch === true) {
      return;
    }
    const activeBranchIds = await this.orgSettings.listActiveBranchIds(tx, orgId);
    if (activeBranchIds.length >= 1) {
      throw new ForbiddenError(
        'Plan limit reached',
        { limit: 'branches', max: 1, planKey: entitlements.planKey },
        'PLAN_LIMIT_REACHED',
      );
    }
  }

  /**
   * Keep the Paddle seat count equal to the active branch count on per-branch plans.
   * Call after a branch is created, deactivated or reactivated. Best effort: a provider error
   * is logged, never thrown, because the branch change is already committed.
   */
  async syncBranchQuantity(orgId: string): Promise<void> {
    if (!isCheckoutEnabled(this.env)) {
      return;
    }
    const priceMap = paddlePriceMapFromEnv(this.env);
    const action = await withOrg(this.db, orgId, async (tx) => {
      const sub = await this.billingRepo.findSubscriptionWithPlan(tx, orgId);
      if (
        sub === null ||
        sub.providerSubscriptionId === null ||
        !sub.perBranch ||
        !isLivePaddleSubscription(sub, this.clock.now())
      ) {
        return null;
      }
      const priceId = priceIdForPlanKey(priceMap, sub.planKey);
      if (priceId === null) {
        return null;
      }
      // Always send: the stored quantity only updates when Paddle's webhook arrives, so it can
      // be stale right after an earlier sync.
      const quantity = await this.quantityForPlan(tx, orgId, sub.planKey);
      const body: PaddleUpdateSubscriptionBody = {
        items: [{ price_id: priceId, quantity }],
        proration_billing_mode: 'prorated_immediately',
      };
      return { subscriptionId: sub.providerSubscriptionId, body };
    });
    if (action === null) {
      return;
    }
    try {
      await this.paddle.updateSubscription(action.subscriptionId, action.body);
    } catch (err: unknown) {
      this.logger.error(
        { err: err instanceof Error ? err.message : String(err), orgId },
        'Paddle branch quantity sync failed',
      );
    }
  }

  /** Per-branch plans bill one seat per active branch; others bill one. */
  private async quantityForPlan(
    tx: DrizzleTx,
    orgId: string,
    planKey: BillingCheckoutBody['planKey'],
  ): Promise<number> {
    const planRows = await this.billingRepo.listPublicPlans(tx);
    const target = planRows.find((p) => p.key === planKey);
    if (target?.perBranch !== true) {
      return 1;
    }
    const activeBranchIds = await this.orgSettings.listActiveBranchIds(tx, orgId);
    return Math.max(1, activeBranchIds.length);
  }

  private rethrowProvider(err: unknown): never {
    if (err instanceof PaddleProviderError) {
      throw new BadGatewayError(
        'BILLING_PROVIDER_ERROR',
        'Billing provider request failed',
        { paddleErrorCode: err.paddleErrorCode },
      );
    }
    throw err;
  }
}
