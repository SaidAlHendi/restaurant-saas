import { Inject, Injectable } from '@nestjs/common';
import { and, count, countDistinct, eq, gt, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { ADMIN_ORG_STATUSES, type AdminOrgStatus, type AdminOverview } from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { plans, subscriptions } from '../../../core/db/schema/billing';
import { organizations } from '../../../core/db/schema/tenancy';
import { orders } from '../../../core/db/schema/ordering';

const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE_STATUSES = ['active', 'past_due'] as const;

/** Cross-tenant platform numbers on the admin pool (app_admin, BYPASSRLS). */
@Injectable()
export class AdminOverviewService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async get(now: Date = new Date()): Promise<AdminOverview> {
    const since24h = new Date(now.getTime() - DAY_MS);
    const since30d = new Date(now.getTime() - 30 * DAY_MS);

    const statusRows = await this.db
      .select({ status: organizations.status, total: count() })
      .from(organizations)
      .groupBy(organizations.status);

    const [trialRow] = await this.db
      .select({ total: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'trialing'));

    // MRR = price × branches for per-branch plans, price for flat plans. Past-due still counts as live.
    // Manually activated subscriptions (no provider) count only what was recorded as paid, and only
    // until their period ends; an unpaid or expired grant adds 0.
    const mixRows = await this.db
      .select({
        planKey: plans.key,
        planName: plans.name,
        currency: plans.currency,
        sortOrder: plans.sortOrder,
        subscriptions: count(),
        mrrMinor: sql<string>`coalesce(sum(case
          when ${subscriptions.provider} is null then
            case when ${subscriptions.manualPaid} is true and ${subscriptions.currentPeriodEnd} > ${now.toISOString()}::timestamptz
              then coalesce(${subscriptions.manualAmountMinor}, 0) else 0 end
          else ${plans.priceMinor} * case when ${plans.perBranch} then ${subscriptions.branchQuantity} else 1 end
        end), 0)`,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(
        and(
          inArray(subscriptions.status, [...LIVE_STATUSES]),
          // Manual grants count only while paid and unexpired, like their MRR.
          or(
            isNotNull(subscriptions.provider),
            and(eq(subscriptions.manualPaid, true), gt(subscriptions.currentPeriodEnd, now)),
          ),
        ),
      )
      .groupBy(plans.key, plans.name, plans.currency, plans.sortOrder)
      .orderBy(sql`count(*) desc`, plans.sortOrder);

    const [churnRow] = await this.db
      .select({ total: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, 'canceled'), gte(subscriptions.canceledAt, since30d)));

    const [orderRow] = await this.db
      .select({ total: count(), orgs: countDistinct(orders.orgId) })
      .from(orders)
      .where(gte(orders.placedAt, since24h));

    const orgsByStatus = Object.fromEntries(ADMIN_ORG_STATUSES.map((s) => [s, 0])) as Record<
      AdminOrgStatus,
      number
    >;
    for (const row of statusRows) orgsByStatus[row.status] = row.total;

    const planMix = mixRows.map((r) => ({
      planKey: r.planKey,
      planName: r.planName,
      currency: r.currency,
      subscriptions: r.subscriptions,
      mrrMinor: Number(r.mrrMinor),
    }));
    const activeSubscriptions = planMix.reduce((sum, r) => sum + r.subscriptions, 0);

    const mrrByCurrency = new Map<string, number>();
    for (const r of planMix)
      mrrByCurrency.set(r.currency, (mrrByCurrency.get(r.currency) ?? 0) + r.mrrMinor);

    // There is no subscription history, so the churn base is "live now + canceled in the window".
    const churned30d = churnRow?.total ?? 0;
    const churnBase = activeSubscriptions + churned30d;

    return {
      generatedAt: now.toISOString(),
      orgsByStatus,
      orgsTotal: Object.values(orgsByStatus).reduce((a, b) => a + b, 0),
      activeSubscriptions,
      trials: trialRow?.total ?? 0,
      mrr: [...mrrByCurrency].map(([currency, amountMinor]) => ({ currency, amountMinor })),
      churned30d,
      churnRate30d: churnBase > 0 ? churned30d / churnBase : null,
      planMix,
      orders24h: orderRow?.total ?? 0,
      activeOrgs24h: orderRow?.orgs ?? 0,
    };
  }
}
