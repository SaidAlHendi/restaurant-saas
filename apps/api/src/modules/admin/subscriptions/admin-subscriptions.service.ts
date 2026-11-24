import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import {
  ADMIN_TRIAL_ENDING_DAYS,
  pageMeta,
  type AdminSubscriptionListQuery,
  type AdminSubscriptionListResponse,
} from '@app/shared';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { plans, subscriptions } from '../../../core/db/schema/billing';
import { organizations } from '../../../core/db/schema/tenancy';

@Injectable()
export class AdminSubscriptionsService {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async list(query: AdminSubscriptionListQuery): Promise<AdminSubscriptionListResponse> {
    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(subscriptions.status, query.status));
    if (query.plan) conditions.push(eq(plans.key, query.plan));
    if (query.trialEnding) {
      conditions.push(eq(subscriptions.status, 'trialing'));
      conditions.push(gte(subscriptions.trialEndsAt, sql`now()`));
      conditions.push(
        lte(
          subscriptions.trialEndsAt,
          sql`now() + (${ADMIN_TRIAL_ENDING_DAYS} * interval '1 day')`,
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(where);
    const rows = await this.db
      .select({
        id: subscriptions.id,
        orgId: subscriptions.orgId,
        orgName: organizations.name,
        planKey: plans.key,
        planName: plans.name,
        status: subscriptions.status,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        providerSubscriptionId: subscriptions.providerSubscriptionId,
      })
      .from(subscriptions)
      .innerJoin(organizations, eq(organizations.id, subscriptions.orgId))
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(where)
      .orderBy(asc(subscriptions.trialEndsAt), asc(organizations.name), asc(subscriptions.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    return {
      items: rows.map((r) => ({
        ...r,
        trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
        currentPeriodEnd: r.currentPeriodEnd?.toISOString() ?? null,
      })),
      ...pageMeta(query, totalRow?.total ?? 0),
    };
  }
}
