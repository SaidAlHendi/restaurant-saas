import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleDb } from '../../core/db/db.module';
import { products } from '../../core/db/schema/catalog';
import { orderEvents, orderItems, orders } from '../../core/db/schema/ordering';
import { branches } from '../../core/db/schema/tenancy';
import { withOrg } from '../../core/db/with-org';
import { computeBusinessDate } from '../../lib/business-date';
import { newUuidV7 } from '../../lib/uuid';

import type { DemoSeedCliOptions } from './cli';
import { deterministicUuid } from './random';
import type { SeededOrg } from './seed-orgs';

const DRAFT_COUNT = 3;

export async function seedTodayDraftOrders(
  db: DrizzleDb,
  seededOrgs: SeededOrg[],
  options: Pick<DemoSeedCliOptions, 'anchor'>,
): Promise<void> {
  const anchor = options.anchor;
  for (const seeded of seededOrgs) {
    await withOrg(db, seeded.id, async (tx) => {
      const payBranches = await tx
        .select()
        .from(branches)
        .where(and(eq(branches.orgId, seeded.id), eq(branches.payBeforeSend, true)));
      if (payBranches.length === 0) {
        return;
      }
      const branch = payBranches[0];
      if (branch === undefined) {
        return;
      }
      const businessDate = computeBusinessDate({
        now: anchor,
        timezone: branch.timezone,
        dayStartHour: branch.dayStartHour,
      });
      const existing = await tx.execute(sql`
        SELECT count(*)::int AS c FROM orders
        WHERE branch_id = ${branch.id}::uuid AND status = 'draft' AND business_date = ${businessDate}::date
      `);
      const count = (existing.rows[0] as { c: number }).c;
      if (count >= DRAFT_COUNT) {
        return;
      }
      const productRows = await tx
        .select()
        .from(products)
        .where(and(eq(products.orgId, seeded.id), eq(products.isActive, true)))
        .limit(1);
      const product = productRows[0];
      if (product === undefined) {
        return;
      }
      const membershipId = deterministicUuid('membership', seeded.definition.slug, 'cashier1');
      const counterRow = await tx.execute(sql`
        SELECT coalesce(last_order_number, 0)::int AS n FROM branch_counters
        WHERE branch_id = ${branch.id}::uuid AND business_date = ${businessDate}::date
      `);
      let orderNumber = (counterRow.rows[0] as { n: number } | undefined)?.n ?? 0;
      const toCreate = DRAFT_COUNT - count;
      for (let i = 0; i < toCreate; i += 1) {
        orderNumber += 1;
        const orderId = newUuidV7();
        const clientOrderId = newUuidV7();
        const itemId = newUuidV7();
        const eventId = newUuidV7();
        const lineTotal = product.priceMinor;
        const taxMinor = branch.taxInclusive
          ? 0
          : Math.round((lineTotal * branch.taxRateBp) / 10_000);
        const totalMinor = lineTotal + taxMinor;
        await tx.insert(orders).values({
          id: orderId,
          orgId: seeded.id,
          branchId: branch.id,
          clientOrderId,
          orderNumber,
          businessDate,
          type: 'takeaway',
          status: 'draft',
          paymentStatus: 'unpaid',
          tableId: null,
          customerName: `Draft demo ${String(orderNumber)}`,
          notes: null,
          subtotalMinor: lineTotal,
          discountMinor: 0,
          taxMinor,
          totalMinor,
          currency: branch.currency,
          version: 1,
          placedAt: null,
          createdBy: membershipId,
          createdAt: anchor,
          updatedAt: anchor,
        });
        await tx.insert(orderItems).values({
          id: itemId,
          orgId: seeded.id,
          orderId,
          productId: product.id,
          productNameSnapshot: product.name,
          unitPriceMinor: product.priceMinor,
          quantity: 1,
          lineTotalMinor: lineTotal,
          notes: null,
          status: 'pending',
          isAddition: false,
        });
        await tx.insert(orderEvents).values({
          id: eventId,
          orgId: seeded.id,
          orderId,
          type: 'order.drafted',
          fromStatus: null,
          toStatus: 'draft',
          payload: { itemIds: [itemId] },
          actorMembershipId: membershipId,
          createdAt: anchor,
        });
      }
      await tx.execute(sql`
        INSERT INTO branch_counters (branch_id, business_date, org_id, last_order_number)
        VALUES (${branch.id}::uuid, ${businessDate}::date, ${seeded.id}::uuid, ${orderNumber})
        ON CONFLICT (branch_id, business_date)
        DO UPDATE SET last_order_number = GREATEST(
          branch_counters.last_order_number,
          EXCLUDED.last_order_number
        )
      `);
      process.stdout.write(
        `[seed-demo] Draft orders for ${seeded.definition.slug}: ensured ${String(DRAFT_COUNT)} on ${businessDate}\n`,
      );
    });
  }
}
