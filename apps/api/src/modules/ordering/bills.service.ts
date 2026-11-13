import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { computeDueMinor, computeItemShares, computePaymentStatus } from '@app/shared';
import type { Bill, BillListQuery, BillPaymentResult, CreateBillPaymentBody } from '@app/shared';

import { CLOCK, type Clock } from '../../core/clock/clock.tokens';
import type { RequestContext } from '../../core/context/request-context';
import { DRIZZLE, type DrizzleDb } from '../../core/db/db.module';
import { bills, orderItems, orders, paymentItems, payments } from '../../core/db/schema/ordering';
import { withOrg, type DrizzleTx } from '../../core/db/with-org';
import { BusinessRuleError, NotFoundError } from '../../core/errors/app-errors';
import { OutboxService } from '../../core/outbox/outbox.service';
import { isPgUniqueViolation } from '../../lib/pg-errors';
import { newUuidV7 } from '../../lib/uuid';
import { TenancyRepository } from '../tenancy/tenancy.repository';

import {
  ORDER_EVENT_TYPES,
  buildRealtimePayload,
  changeForOrderEvent,
  realtimeTypeForOrderEvent,
} from './ordering.events';
import { moneyDisplayForOrder } from './ordering.mapper';
import { OrderingRepository } from './ordering.repository';
import { resolveCashAmounts } from './cash-amounts';

type BillRow = typeof bills.$inferSelect;
type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

/** An order's items with what each still owes, computed from totals, itemised and loose payments. */
type OrderLedger = {
  order: OrderRow;
  paidMinor: number;
  items: { row: ItemRow; shareMinor: number; paidMinor: number }[];
};

@Injectable()
export class BillsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly repo: OrderingRepository,
    private readonly tenancyRepo: TenancyRepository,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Picks the bill a new dine-in order joins. A per-table advisory lock makes two simultaneous first
   * orders share one bill instead of opening two.
   */
  async resolveBillForNewOrder(
    tx: DrizzleTx,
    ctx: RequestContext,
    branchId: string,
    tableId: string,
    opts: { billId: string | undefined; newBill: boolean; label: string | undefined },
  ): Promise<string> {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${tableId}, 0))`);

    if (opts.billId !== undefined) {
      const [bill] = await tx
        .select()
        .from(bills)
        .where(
          and(eq(bills.id, opts.billId), eq(bills.branchId, branchId), eq(bills.tableId, tableId)),
        )
        .limit(1);
      if (!bill) throw new NotFoundError();
      if (bill.status !== 'open') {
        throw new BusinessRuleError('BILL_CLOSED', 'This bill is already closed', {});
      }
      return bill.id;
    }

    const open = await tx
      .select({ id: bills.id })
      .from(bills)
      .where(
        and(eq(bills.branchId, branchId), eq(bills.tableId, tableId), eq(bills.status, 'open')),
      )
      .orderBy(asc(bills.openedAt), asc(bills.id));

    if (!opts.newBill) {
      if (open.length === 1 && open[0]) return open[0].id;
      if (open.length > 1) {
        throw new BusinessRuleError(
          'BILL_AMBIGUOUS',
          'This table has several open bills; choose one',
          { billIds: open.map((b) => b.id) },
        );
      }
    }

    const id = newUuidV7();
    await tx.insert(bills).values({
      id,
      orgId: ctx.orgId,
      branchId,
      tableId,
      label: opts.label ?? null,
      status: 'open',
      openedBy: ctx.membershipId,
      openedAt: this.clock.now(),
    });
    return id;
  }

  async listBills(ctx: RequestContext, branchId: string, query: BillListQuery): Promise<Bill[]> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const conditions = [eq(bills.branchId, branchId), eq(bills.status, query.status)];
      if (query.tableId) conditions.push(eq(bills.tableId, query.tableId));
      const rows = await tx
        .select()
        .from(bills)
        .where(and(...conditions))
        .orderBy(asc(bills.openedAt), asc(bills.id))
        .limit(100);
      return this.buildBills(tx, branchId, rows);
    });
  }

  async getBill(ctx: RequestContext, branchId: string, billId: string): Promise<Bill> {
    return withOrg(this.db, ctx.orgId, async (tx) => this.loadBill(tx, branchId, billId));
  }

  async closeBill(ctx: RequestContext, branchId: string, billId: string): Promise<Bill> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const bill = await this.lockBill(tx, branchId, billId);
      if (bill.status === 'closed') return this.loadBill(tx, branchId, billId);
      const ledgers = await this.loadLedgers(tx, billId, true);
      const live = ledgers.filter((l) => l.order.status !== 'cancelled');
      if (live.some((l) => l.order.status !== 'completed')) {
        throw new BusinessRuleError(
          'BILL_ORDERS_OPEN',
          'All orders on the bill must be completed first',
          {},
        );
      }
      const due = live.reduce(
        (sum, l) => sum + computeDueMinor(l.order.totalMinor, l.paidMinor),
        0,
      );
      if (due > 0) {
        throw new BusinessRuleError('BILL_NOT_PAID', 'The bill still has an amount due', {
          dueMinor: due,
        });
      }
      await tx
        .update(bills)
        .set({ status: 'closed', closedAt: this.clock.now(), version: bill.version + 1 })
        .where(eq(bills.id, billId));
      return this.loadBill(tx, branchId, billId);
    });
  }

  async payBill(
    ctx: RequestContext,
    branchId: string,
    billId: string,
    body: CreateBillPaymentBody,
  ): Promise<BillPaymentResult> {
    try {
      return await this.payBillInTransaction(ctx, branchId, billId, body);
    } catch (err: unknown) {
      if (isPgUniqueViolation(err, 'payments_order_client_payment_unique')) {
        // A concurrent retry of the same payment won the race: answer from what it stored.
        return withOrg(this.db, ctx.orgId, async (tx) =>
          this.replayPayment(tx, branchId, billId, body.clientPaymentId),
        );
      }
      throw err;
    }
  }

  private payBillInTransaction(
    ctx: RequestContext,
    branchId: string,
    billId: string,
    body: CreateBillPaymentBody,
  ): Promise<BillPaymentResult> {
    return withOrg(this.db, ctx.orgId, async (tx) => {
      const bill = await this.lockBill(tx, branchId, billId);

      const replay = await this.replayPayment(tx, branchId, billId, body.clientPaymentId);
      if (!replay.created && replay.amountMinor > 0) return replay;

      if (bill.status !== 'open') {
        throw new BusinessRuleError('BILL_CLOSED', 'This bill is already closed', {});
      }

      const branch = await this.tenancyRepo.findBranchById(tx, branchId);
      if (!branch || branch.orgId !== ctx.orgId) throw new NotFoundError();
      if (body.method === 'card' && !branch.acceptsCard) {
        throw new BusinessRuleError(
          'PAYMENT_METHOD_NOT_ACCEPTED',
          'Card payments are not accepted at this branch',
          { branchId },
        );
      }

      const ledgers = (await this.loadLedgers(tx, billId, true)).filter(
        (l) => l.order.status !== 'cancelled',
      );
      const dueOf = (item: { shareMinor: number; paidMinor: number }) =>
        Math.max(0, item.shareMinor - item.paidMinor);

      // Which items does this payment cover, and how much of each?
      const allocations: { ledger: OrderLedger; item: ItemRow; amountMinor: number }[] = [];
      if (body.itemIds) {
        const wanted = new Set(body.itemIds);
        for (const ledger of ledgers) {
          for (const item of ledger.items) {
            if (!wanted.has(item.row.id)) continue;
            wanted.delete(item.row.id);
            const due = dueOf(item);
            if (due <= 0 || item.row.voidedAt !== null) {
              throw new BusinessRuleError(
                'BILL_ITEM_NOT_PAYABLE',
                'An item is already paid or voided',
                { itemId: item.row.id },
              );
            }
            allocations.push({ ledger, item: item.row, amountMinor: due });
          }
        }
        if (wanted.size > 0) {
          throw new BusinessRuleError('BILL_ITEM_NOT_PAYABLE', 'An item is not on this bill', {
            itemId: [...wanted][0],
          });
        }
        const total = allocations.reduce((sum, a) => sum + a.amountMinor, 0);
        if (body.amountMinor !== undefined && body.amountMinor !== total) {
          throw new BusinessRuleError(
            'BILL_AMOUNT_MISMATCH',
            'Amount does not match the selected items',
            { expectedMinor: total, amountMinor: body.amountMinor },
          );
        }
      } else {
        let remaining = body.amountMinor ?? 0;
        const totalDue = ledgers.reduce(
          (sum, l) => sum + l.items.reduce((s, i) => s + dueOf(i), 0),
          0,
        );
        if (remaining <= 0 || remaining > totalDue) {
          throw new BusinessRuleError('PAYMENT_EXCEEDS_DUE', 'Payment amount exceeds amount due', {
            amountMinor: remaining,
            dueMinor: totalDue,
          });
        }
        for (const ledger of ledgers) {
          for (const item of ledger.items) {
            if (remaining <= 0) break;
            const take = Math.min(dueOf(item), remaining);
            if (take <= 0) continue;
            allocations.push({ ledger, item: item.row, amountMinor: take });
            remaining -= take;
          }
        }
      }

      const amountMinor = allocations.reduce((sum, a) => sum + a.amountMinor, 0);
      if (amountMinor <= 0) {
        throw new BusinessRuleError('PAYMENT_EXCEEDS_DUE', 'Nothing is due', { dueMinor: 0 });
      }

      // Group per order, in bill order.
      const perOrder = new Map<
        string,
        { ledger: OrderLedger; amountMinor: number; rows: typeof allocations }
      >();
      for (const a of allocations) {
        const entry = perOrder.get(a.ledger.order.id) ?? {
          ledger: a.ledger,
          amountMinor: 0,
          rows: [],
        };
        entry.amountMinor += a.amountMinor;
        entry.rows.push(a);
        perOrder.set(a.ledger.order.id, entry);
      }
      const groups = [...perOrder.values()];
      const first = groups[0];
      if (!first) throw new NotFoundError();

      const cash =
        body.method === 'cash'
          ? resolveCashAmounts(
              {
                amountMinor,
                tenderedMinor: body.tenderedMinor,
                displayTenderedMinor: body.displayTenderedMinor,
              },
              first.ledger.order.currency,
              moneyDisplayForOrder(first.ledger.order),
            )
          : null;

      const now = this.clock.now();
      for (const [index, group] of groups.entries()) {
        const order = group.ledger.order;
        const orderDue = computeDueMinor(order.totalMinor, group.ledger.paidMinor);
        if (group.amountMinor > orderDue) {
          // Itemised shares can never exceed what the order owes; guards bad legacy data.
          throw new BusinessRuleError('PAYMENT_EXCEEDS_DUE', 'Payment amount exceeds amount due', {
            amountMinor: group.amountMinor,
            dueMinor: orderDue,
          });
        }
        const paymentId = newUuidV7();
        const carriesTender = index === 0 && cash !== null;
        await this.repo.insertPayment(tx, {
          id: paymentId,
          orgId: ctx.orgId,
          orderId: order.id,
          clientPaymentId: body.clientPaymentId,
          method: body.method,
          amountMinor: group.amountMinor,
          tenderedMinor: carriesTender ? cash.tenderedMinor : null,
          changeMinor: carriesTender ? cash.changeMinor : null,
          displayTenderedMinor: carriesTender ? cash.displayTenderedMinor : null,
          displayChangeMinor: carriesTender ? cash.displayChangeMinor : null,
          status: 'captured',
          createdBy: ctx.membershipId,
        });
        await tx.insert(paymentItems).values(
          group.rows.map((r) => ({
            id: newUuidV7(),
            orgId: ctx.orgId,
            paymentId,
            orderItemId: r.item.id,
            amountMinor: r.amountMinor,
          })),
        );

        const paymentStatus = computePaymentStatus(
          order.totalMinor,
          group.ledger.paidMinor + group.amountMinor,
        );
        const placingFromDraft = paymentStatus === 'paid' && order.status === 'draft';
        const updated = placingFromDraft
          ? await this.repo.updateOrderPaymentStatusAndPlaceFromDraft(
              tx,
              order.id,
              order.version,
              paymentStatus,
              now,
            )
          : await this.repo.updateOrderPaymentStatus(tx, order.id, order.version, paymentStatus);
        if (!updated) {
          throw new BusinessRuleError('ORDER_VERSION_CONFLICT', 'Order changed, try again', {});
        }
        await this.repo.insertOrderEvent(tx, {
          id: newUuidV7(),
          orgId: ctx.orgId,
          orderId: order.id,
          type: ORDER_EVENT_TYPES.paymentCaptured,
          fromStatus: order.status,
          toStatus: order.status,
          payload: { paymentId, method: body.method, amountMinor: group.amountMinor, billId },
          actorMembershipId: ctx.membershipId,
        });
        await this.writeOutbox(
          tx,
          ctx.orgId,
          branchId,
          order.id,
          ORDER_EVENT_TYPES.paymentCaptured,
          updated,
        );
        if (placingFromDraft) {
          await this.repo.insertOrderEvent(tx, {
            id: newUuidV7(),
            orgId: ctx.orgId,
            orderId: order.id,
            type: ORDER_EVENT_TYPES.placed,
            fromStatus: 'draft',
            toStatus: 'placed',
            payload: {},
            actorMembershipId: ctx.membershipId,
          });
          await this.writeOutbox(
            tx,
            ctx.orgId,
            branchId,
            order.id,
            ORDER_EVENT_TYPES.placed,
            updated,
          );
        }
      }

      return {
        created: true,
        amountMinor,
        changeMinor: cash?.changeMinor ?? null,
        bill: await this.loadBill(tx, branchId, billId),
      };
    });
  }

  /** Answers a retried payment from what is stored; `created` is false and amount 0 when unknown. */
  private async replayPayment(
    tx: DrizzleTx,
    branchId: string,
    billId: string,
    clientPaymentId: string,
  ): Promise<BillPaymentResult> {
    const rows = await tx
      .select({
        amountMinor: payments.amountMinor,
        changeMinor: payments.changeMinor,
      })
      .from(payments)
      .innerJoin(orders, and(eq(orders.id, payments.orderId), eq(orders.billId, billId)))
      .where(eq(payments.clientPaymentId, clientPaymentId));
    const amountMinor = rows.reduce((sum, r) => sum + r.amountMinor, 0);
    const change = rows.find((r) => r.changeMinor !== null)?.changeMinor ?? null;
    return {
      created: false,
      amountMinor,
      changeMinor: change,
      bill: await this.loadBill(tx, branchId, billId),
    };
  }

  private async lockBill(tx: DrizzleTx, branchId: string, billId: string): Promise<BillRow> {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.branchId, branchId)))
      .limit(1)
      .for('update');
    if (!bill) throw new NotFoundError();
    return bill;
  }

  private async loadBill(tx: DrizzleTx, branchId: string, billId: string): Promise<Bill> {
    const [row] = await tx
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.branchId, branchId)))
      .limit(1);
    if (!row) throw new NotFoundError();
    const [bill] = await this.buildBills(tx, branchId, [row]);
    if (!bill) throw new NotFoundError();
    return bill;
  }

  /** Loads each order of a bill with per-item shares and what is already paid on each item. */
  private async loadLedgers(tx: DrizzleTx, billId: string, lock: boolean): Promise<OrderLedger[]> {
    const base = tx
      .select()
      .from(orders)
      .where(eq(orders.billId, billId))
      .orderBy(asc(orders.createdAt), asc(orders.id));
    const orderRows = lock ? await base.for('update') : await base;
    return this.ledgersFor(tx, orderRows);
  }

  private async ledgersFor(tx: DrizzleTx, orderRows: OrderRow[]): Promise<OrderLedger[]> {
    const orderIds = orderRows.map((o) => o.id);
    const itemRows = await this.repo.listOrderItemsForOrderIds(tx, orderIds);
    const paidByOrder = await this.repo.sumCapturedMinorByOrderIds(tx, orderIds);
    const itemIds = itemRows.map((i) => i.id);
    const itemisedRows =
      itemIds.length === 0
        ? []
        : await tx
            .select({
              orderItemId: paymentItems.orderItemId,
              total: sql<string>`sum(${paymentItems.amountMinor})::bigint`,
            })
            .from(paymentItems)
            .where(inArray(paymentItems.orderItemId, itemIds))
            .groupBy(paymentItems.orderItemId);
    const itemised = new Map(itemisedRows.map((r) => [r.orderItemId, Number(r.total)]));

    return orderRows.map((order) => {
      const items = itemRows.filter((i) => i.orderId === order.id);
      const live = items.filter((i) => i.voidedAt === null);
      const shares = computeItemShares(order, live);
      const paidMinor = paidByOrder.get(order.id) ?? 0;
      // Money taken through the order endpoint has no item breakdown: it settles the oldest items.
      let loose = Math.max(
        0,
        paidMinor - live.reduce((sum, i) => sum + (itemised.get(i.id) ?? 0), 0),
      );
      return {
        order,
        paidMinor,
        items: items.map((row) => {
          const share = row.voidedAt === null ? (shares.get(row.id) ?? 0) : 0;
          let itemPaid = Math.min(share, itemised.get(row.id) ?? 0);
          if (loose > 0 && itemPaid < share) {
            const extra = Math.min(share - itemPaid, loose);
            itemPaid += extra;
            loose -= extra;
          }
          return { row, shareMinor: share, paidMinor: itemPaid };
        }),
      };
    });
  }

  private async buildBills(tx: DrizzleTx, branchId: string, rows: BillRow[]): Promise<Bill[]> {
    if (rows.length === 0) return [];
    const orderRows = await tx
      .select()
      .from(orders)
      .where(
        inArray(
          orders.billId,
          rows.map((b) => b.id),
        ),
      )
      .orderBy(asc(orders.createdAt), asc(orders.id));
    const ledgers = await this.ledgersFor(tx, orderRows);
    const labels = await this.repo.listTableLabelsForBranch(tx, branchId, [
      ...new Set(rows.map((b) => b.tableId)),
    ]);
    const labelById = new Map(labels.map((l) => [l.id, l.label]));

    return rows.map((bill) => {
      const mine = ledgers.filter((l) => l.order.billId === bill.id);
      const billOrders = mine.map((ledger, index) => {
        const cancelled = ledger.order.status === 'cancelled';
        const totalMinor = cancelled ? 0 : ledger.order.totalMinor;
        const paidMinor = cancelled ? 0 : ledger.paidMinor;
        return {
          id: ledger.order.id,
          orderNumber: ledger.order.orderNumber,
          status: ledger.order.status,
          round: index + 1,
          version: ledger.order.version,
          totalMinor,
          paidMinor,
          dueMinor: computeDueMinor(totalMinor, paidMinor),
          createdAt: ledger.order.createdAt.toISOString(),
          items: ledger.items.map(({ row, shareMinor, paidMinor: itemPaid }) => ({
            id: row.id,
            productNameSnapshot: row.productNameSnapshot as Record<string, string>,
            quantity: row.quantity,
            lineTotalMinor: row.lineTotalMinor,
            shareMinor: cancelled ? 0 : shareMinor,
            paidMinor: cancelled ? 0 : itemPaid,
            seat: row.seat,
            status: row.status,
            voided: row.voidedAt !== null,
          })),
        };
      });
      const totalMinor = billOrders.reduce((s, o) => s + o.totalMinor, 0);
      const paidMinor = billOrders.reduce((s, o) => s + o.paidMinor, 0);
      return {
        id: bill.id,
        branchId: bill.branchId,
        tableId: bill.tableId,
        tableLabel: labelById.get(bill.tableId) ?? null,
        label: bill.label,
        status: bill.status,
        version: bill.version,
        currency: mine[0]?.order.currency ?? 'USD',
        openedAt: bill.openedAt.toISOString(),
        closedAt: bill.closedAt ? bill.closedAt.toISOString() : null,
        totalMinor,
        paidMinor,
        dueMinor: computeDueMinor(totalMinor, paidMinor),
        orders: billOrders,
      };
    });
  }

  private async writeOutbox(
    tx: DrizzleTx,
    orgId: string,
    branchId: string,
    orderId: string,
    eventType: string,
    order: { status: OrderRow['status']; version: number },
  ) {
    await this.outbox.write(tx, {
      orgId,
      branchId,
      type: realtimeTypeForOrderEvent(eventType),
      aggregateId: orderId,
      payload: buildRealtimePayload({
        orderId,
        branchId,
        status: order.status,
        version: order.version,
        change: changeForOrderEvent(eventType),
      }),
    });
  }
}
