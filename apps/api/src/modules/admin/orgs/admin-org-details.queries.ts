import { and, asc, count, desc, eq, gte, inArray, isNull, max, sql } from 'drizzle-orm';
import { ADMIN_ORG_HISTORY_LIMIT, type AdminOrgDetail } from '@app/shared';

import type { AdminDrizzleDb } from '../../../core/db/admin-db.tokens';
import { adminUsers, auditLogs } from '../../../core/db/schema/admin';
import { planFeatures, plans, subscriptions } from '../../../core/db/schema/billing';
import { categories, products } from '../../../core/db/schema/catalog';
import { users } from '../../../core/db/schema/identity';
import { diningTables, orders } from '../../../core/db/schema/ordering';
import {
  branches,
  membershipBranches,
  memberships,
  posDevices,
  roles,
} from '../../../core/db/schema/tenancy';
import { COUNTED_ORDER_STATUSES } from '../../reporting/daily-report.utils';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type OrgDetails = Pick<
  AdminOrgDetail,
  'branches' | 'planDetail' | 'orderStats' | 'catalog' | 'team' | 'history'
>;

/**
 * Everything on the restaurant page beyond the list row. Runs on the admin pool, which bypasses RLS,
 * so every query here must filter by `orgId`. Selects only columns granted to `app_admin`.
 */
export async function loadOrgDetails(
  db: AdminDrizzleDb,
  orgId: string,
  now: Date = new Date(),
): Promise<OrgDetails> {
  const since = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();
  const counted = and(eq(orders.orgId, orgId), inArray(orders.status, [...COUNTED_ORDER_STATUSES]));
  const recent = sql`${orders.createdAt} >= ${since}::timestamptz`;

  const branchRows = await db
    .select({
      id: branches.id,
      name: branches.name,
      slug: branches.slug,
      isActive: branches.isActive,
      address: branches.address,
      timezone: branches.timezone,
      currency: branches.currency,
      taxRateBp: branches.taxRateBp,
      taxInclusive: branches.taxInclusive,
      dayStartHour: branches.dayStartHour,
      payBeforeSend: branches.payBeforeSend,
      acceptsCard: branches.acceptsCard,
      pagerEnabled: branches.pagerEnabled,
      supportsDineIn: branches.supportsDineIn,
      supportsTakeaway: branches.supportsTakeaway,
      createdAt: branches.createdAt,
    })
    .from(branches)
    .where(eq(branches.orgId, orgId))
    .orderBy(asc(branches.createdAt));

  const orderRows = await db
    .select({
      branchId: orders.branchId,
      total: count(),
      last30Days: sql<number>`count(*) filter (where ${recent})::int`,
      lastOrderAt: max(orders.createdAt),
    })
    .from(orders)
    .where(counted)
    .groupBy(orders.branchId);

  const salesRows = await db
    .select({
      currency: orders.currency,
      amountMinor: sql<string>`coalesce(sum(${orders.totalMinor}), 0)`,
    })
    .from(orders)
    .where(and(counted, gte(orders.createdAt, new Date(since))))
    .groupBy(orders.currency)
    .orderBy(asc(orders.currency));

  const tableRows = await db
    .select({ branchId: diningTables.branchId, total: count() })
    .from(diningTables)
    .where(and(eq(diningTables.orgId, orgId), eq(diningTables.isActive, true)))
    .groupBy(diningTables.branchId);

  const deviceRows = await db
    .select({
      id: posDevices.id,
      branchId: posDevices.branchId,
      name: posDevices.name,
      status: posDevices.status,
      lastUsedAt: posDevices.lastUsedAt,
    })
    .from(posDevices)
    .where(eq(posDevices.orgId, orgId))
    .orderBy(asc(posDevices.createdAt));

  const [categoryRow] = await db
    .select({ total: count() })
    .from(categories)
    .where(and(eq(categories.orgId, orgId), isNull(categories.deletedAt)));
  const [productRow] = await db
    .select({ total: count() })
    .from(products)
    .where(and(eq(products.orgId, orgId), isNull(products.deletedAt)));

  const memberRows = await db
    .select({
      membershipId: memberships.id,
      name: users.name,
      email: users.email,
      roleKey: roles.key,
      roleName: roles.name,
      status: memberships.status,
      lastLoginAt: users.lastLoginAt,
      allBranches: memberships.allBranches,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(roles, eq(roles.id, memberships.roleId))
    .where(eq(memberships.orgId, orgId))
    .orderBy(asc(memberships.createdAt));

  const memberBranchRows = await db
    .select({ membershipId: membershipBranches.membershipId, name: branches.name })
    .from(membershipBranches)
    .innerJoin(branches, eq(branches.id, membershipBranches.branchId))
    .where(eq(membershipBranches.orgId, orgId))
    .orderBy(asc(branches.createdAt));

  const [plan] = await db
    .select({
      id: plans.id,
      priceMinor: plans.priceMinor,
      currency: plans.currency,
      perBranch: plans.perBranch,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);
  const features = plan
    ? await db
        .select({ key: planFeatures.featureKey, limit: planFeatures.limitValue })
        .from(planFeatures)
        .where(eq(planFeatures.planId, plan.id))
        .orderBy(asc(planFeatures.featureKey))
    : [];

  const historyRows = await db
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      action: auditLogs.action,
      actorName: adminUsers.name,
    })
    .from(auditLogs)
    .innerJoin(adminUsers, eq(adminUsers.id, auditLogs.adminUserId))
    .where(eq(auditLogs.orgId, orgId))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(ADMIN_ORG_HISTORY_LIMIT);

  const ordersByBranch = new Map(orderRows.map((r) => [r.branchId, r]));
  const tablesByBranch = new Map(tableRows.map((r) => [r.branchId, r.total]));
  const latest = orderRows.reduce<Date | null>(
    (best, r) => (r.lastOrderAt && (!best || r.lastOrderAt > best) ? r.lastOrderAt : best),
    null,
  );

  return {
    branches: branchRows.map((branch) => ({
      ...branch,
      createdAt: branch.createdAt.toISOString(),
      tableCount: tablesByBranch.get(branch.id) ?? 0,
      devices: deviceRows
        .filter((device) => device.branchId === branch.id)
        .map((device) => ({
          id: device.id,
          name: device.name,
          status: device.status,
          lastUsedAt: device.lastUsedAt?.toISOString() ?? null,
        })),
      ordersLast30Days: ordersByBranch.get(branch.id)?.last30Days ?? 0,
      lastOrderAt: ordersByBranch.get(branch.id)?.lastOrderAt?.toISOString() ?? null,
    })),
    orderStats: {
      total: orderRows.reduce((sum, r) => sum + r.total, 0),
      last30Days: orderRows.reduce((sum, r) => sum + r.last30Days, 0),
      lastOrderAt: latest?.toISOString() ?? null,
      salesLast30Days: salesRows.map((r) => ({
        currency: r.currency,
        amountMinor: Number(r.amountMinor),
      })),
    },
    catalog: {
      categoryCount: categoryRow?.total ?? 0,
      productCount: productRow?.total ?? 0,
    },
    team: memberRows.map((member) => ({
      ...member,
      lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
      branchNames: member.allBranches
        ? []
        : memberBranchRows
            .filter((row) => row.membershipId === member.membershipId)
            .map((row) => row.name),
    })),
    planDetail: plan
      ? {
          priceMinor: plan.priceMinor,
          currency: plan.currency,
          perBranch: plan.perBranch,
          features,
        }
      : null,
    history: historyRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  };
}
