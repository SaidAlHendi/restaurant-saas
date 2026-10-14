import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

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
import { users } from '../../core/db/schema/identity';
import { withOrg } from '../../core/db/with-org';
import {
  BadGatewayError,
  ConflictError,
  ValidationError,
} from '../../core/errors/app-errors';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import { BillingRepository } from './billing.repository';
import { EntitlementsService } from './entitlements.service';
import { isLivePaddleSubscription } from './is-live-paddle-subscription';
import {
  PaddleProviderError,
  type PaddleClient,
} from './paddle-client';
import {
  isCheckoutEnabled,
  paddlePriceMapFromEnv,
  priceIdForPlanKey,
} from './paddle-price-map';
import { PADDLE_CLIENT } from './paddle.tokens';
import { featuresAndLimitsFromRows } from './plan-features.util';

@Injectable()
export class BillingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(PADDLE_CLIENT) private readonly paddle: PaddleClient,
    private readonly billingRepo: BillingRepository,
    private readonly entitlements: EntitlementsService,
    private readonly tenancyRepo: TenancyRepository,
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

      const activeBranchIds = await this.tenancyRepo.listActiveBranchIds(tx, ctx.orgId);
      const planRows = await this.billingRepo.listPublicPlans(tx);
      const target = planRows.find((p) => p.key === body.planKey);
      const quantity = target?.perBranch === true ? Math.max(1, activeBranchIds.length) : 1;

      const emailRows = await tx
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);
      const email = emailRows[0]?.email;
      if (email === null || email === undefined) {
        throw new ValidationError('Owner email is required for checkout');
      }

      const response: BillingCheckoutResponse = {
        priceId,
        quantity,
        customData: { orgId: ctx.orgId },
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

    try {
      await withOrg(this.db, ctx.orgId, async (tx) => {
        const sub = await this.billingRepo.findSubscriptionWithPlan(tx, ctx.orgId);
        const now = this.clock.now();
        if (sub === null || !isLivePaddleSubscription(sub, now)) {
          throw new ConflictError(
            'No live Paddle subscription',
            {},
            'BILLING_NO_SUBSCRIPTION',
          );
        }
        if (sub.providerSubscriptionId === null) {
          throw new ConflictError(
            'No live Paddle subscription',
            {},
            'BILLING_NO_SUBSCRIPTION',
          );
        }

        if (body.planKey === sub.planKey) {
          throw new ConflictError('Already on this plan');
        }

        if (body.planKey === 'free') {
          await this.paddle.cancelSubscriptionAtPeriodEnd(sub.providerSubscriptionId, {
            effective_from: 'next_billing_period',
          });
          return;
        }

        const priceId = priceIdForPlanKey(priceMap, body.planKey);
        if (priceId === null) {
          throw new ValidationError('Plan price is not configured');
        }

        const activeBranchIds = await this.tenancyRepo.listActiveBranchIds(tx, ctx.orgId);
        const planRows = await this.billingRepo.listPublicPlans(tx);
        const target = planRows.find((p) => p.key === body.planKey);
        const quantity = target?.perBranch === true ? Math.max(1, activeBranchIds.length) : 1;

        const patchBody: {
          items: Array<{ price_id: string; quantity: number }>;
          proration_billing_mode: 'prorated_immediately';
          scheduled_change?: null;
        } = {
          items: [{ price_id: priceId, quantity }],
          proration_billing_mode: 'prorated_immediately',
        };
        if (sub.scheduledChange !== null) {
          patchBody.scheduled_change = null;
        }

        await this.paddle.updateSubscription(sub.providerSubscriptionId, patchBody);
      });
    } catch (err: unknown) {
      this.rethrowProvider(err);
    }

    return { ok: true };
  }

  async portal(ctx: RequestContext): Promise<{ url: string }> {
    if (!isCheckoutEnabled(this.env)) {
      throw new ValidationError('Billing provider is not configured');
    }

    try {
      return await withOrg(this.db, ctx.orgId, async (tx) => {
        const sub = await this.billingRepo.findSubscriptionWithPlan(tx, ctx.orgId);
        if (sub === null || sub.providerCustomerId === null) {
          throw new ConflictError(
            'No Paddle customer for portal',
            {},
            'BILLING_NO_SUBSCRIPTION',
          );
        }
        return this.paddle.createCustomerPortalSession(sub.providerCustomerId);
      });
    } catch (err: unknown) {
      this.rethrowProvider(err);
    }
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
