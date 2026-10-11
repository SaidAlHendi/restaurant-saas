import {
  computeLineTotalMinor,
  computeOrderTotals,
  computePaymentStatus,
} from '@app/shared';
import type { LocalizedText, OrderStatus } from '@app/shared';

import { computeBusinessDate } from '../../lib/business-date';
import { ORDER_EVENT_TYPES } from '../../modules/ordering/ordering.events';

import type { DemoSeedCliOptions } from './cli';
import { addMinutes, dateAtLocalTime, isWeekendBusinessDate } from './order-time';
import type { BranchOrderContext, SeedModifier, SeedProduct } from './order-load-context';
import { createDemoRng, deterministicUuid } from './random';

const CHUNK = 500;

export type PlannedItemModifier = {
  id: string;
  orgId: string;
  orderItemId: string;
  modifierId: string;
  nameSnapshot: LocalizedText;
  priceDeltaMinor: number;
};

export type PlannedItem = {
  id: string;
  orgId: string;
  orderId: string;
  productId: string;
  productNameSnapshot: LocalizedText;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  notes: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'voided';
  isAddition: boolean;
  voidedAt: Date | null;
  voidReason: string | null;
  voidedBy: string | null;
  createdAt: Date;
  modifiers: PlannedItemModifier[];
};

export type PlannedEvent = {
  id: string;
  orgId: string;
  orderId: string;
  type: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  payload: Record<string, unknown>;
  actorMembershipId: string;
  createdAt: Date;
};

export type PlannedPayment = {
  id: string;
  orgId: string;
  orderId: string;
  clientPaymentId: string;
  method: 'cash' | 'card';
  amountMinor: number;
  tenderedMinor: number | null;
  changeMinor: number | null;
  status: 'captured';
  createdBy: string;
  createdAt: Date;
};

export type PlannedOrder = {
  order: {
    id: string;
    orgId: string;
    branchId: string;
    clientOrderId: string;
    orderNumber: number;
    businessDate: string;
    type: 'dine_in' | 'takeaway';
    status: OrderStatus;
    paymentStatus: ReturnType<typeof computePaymentStatus>;
    tableId: string | null;
    customerName: string | null;
    notes: string | null;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    currency: string;
    cancelReason: string | null;
    version: number;
    placedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
  items: PlannedItem[];
  events: PlannedEvent[];
  payments: PlannedPayment[];
};

export type GeneratedBranchOrders = {
  branchId: string;
  orgId: string;
  counterByDate: Map<string, number>;
  orders: PlannedOrder[];
};

type ModifierGroupMeta = {
  groupId: string;
  minSelect: number;
  maxSelect: number;
  options: SeedModifier[];
};

function groupModifiers(product: SeedProduct): ModifierGroupMeta[] {
  const byGroup = new Map<string, ModifierGroupMeta>();
  for (const mod of product.modifiers) {
    let entry = byGroup.get(mod.groupId);
    if (!entry) {
      entry = {
        groupId: mod.groupId,
        minSelect: mod.minSelect,
        maxSelect: mod.maxSelect,
        options: [],
      };
      byGroup.set(mod.groupId, entry);
    }
    entry.options.push(mod);
  }
  return [...byGroup.values()];
}

function pickModifiers(rng: () => number, product: SeedProduct): SeedModifier[] {
  const groups = groupModifiers(product);
  const chosen: SeedModifier[] = [];
  for (const group of groups) {
    const opts = group.options;
    if (opts.length === 0) {
      continue;
    }
    const count =
      group.minSelect > 0
        ? group.minSelect
        : rng() < 0.45
          ? 1
          : 0;
    const capped = Math.min(count, group.maxSelect, opts.length);
    for (let i = 0; i < capped; i += 1) {
      const idx = Math.floor(rng() * opts.length);
      const mod = opts[idx];
      if (mod && !chosen.some((c) => c.id === mod.id)) {
        chosen.push(mod);
      }
    }
  }
  return chosen;
}

function pickProduct(rng: () => number, products: SeedProduct[]): SeedProduct {
  const weights = products.map((p) => 1 + Math.max(0, 20 - p.sortOrder));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < products.length; i += 1) {
    roll -= weights[i] ?? 0;
    const prod = products[i];
    if (prod && roll <= 0) {
      return prod;
    }
  }
  const last = products[products.length - 1];
  if (!last) {
    throw new Error('No products for order generation');
  }
  return last;
}

function pickOrderHour(rng: () => number): { hour: number; minute: number } {
  const peak = rng();
  let hour: number;
  if (peak < 0.45) {
    hour = 11 + Math.floor(rng() * 4);
  } else if (peak < 0.9) {
    hour = 18 + Math.floor(rng() * 4);
  } else {
    hour = 9 + Math.floor(rng() * 13);
  }
  const minute = Math.floor(rng() * 60);
  return { hour, minute };
}

function ordersForDay(rng: () => number, businessDate: string): number {
  const weekend = isWeekendBusinessDate(businessDate);
  const min = 25;
  const max = 70;
  const mid = weekend ? 52 : 38;
  const spread = max - min;
  const raw = mid + (rng() - 0.5) * spread;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

function listBusinessDates(
  anchor: Date,
  days: number,
  timezone: string,
  dayStartHour: number,
): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const instant = new Date(anchor.getTime() - i * 86_400_000);
    out.push(
      computeBusinessDate({
        now: instant,
        timezone,
        dayStartHour,
      }),
    );
  }
  return [...new Set(out)];
}

function buildLines(
  rng: () => number,
  ctx: BranchOrderContext,
  orgId: string,
  orderId: string,
  createdAt: Date,
  voidOneItem: boolean,
  actorId: string,
): { items: PlannedItem[]; voidItemId: string | null } {
  const lineCount = 1 + Math.floor(rng() * 3);
  const items: PlannedItem[] = [];
  let voidItemId: string | null = null;

  for (let i = 0; i < lineCount; i += 1) {
    const product = pickProduct(rng, ctx.products);
    const mods = pickModifiers(rng, product);
    const modTotal = mods.reduce((s, m) => s + m.priceDeltaMinor, 0);
    const unitPriceMinor = product.priceMinor + modTotal;
    const quantity = 1 + (rng() < 0.15 ? 1 : 0);
    const itemId = deterministicUuid('order-item', orderId, String(i));
    const shouldVoid = voidOneItem && i === 0 && lineCount > 1;
    if (shouldVoid) {
      voidItemId = itemId;
    }
    items.push({
      id: itemId,
      orgId,
      orderId,
      productId: product.id,
      productNameSnapshot: product.nameSnapshot,
      unitPriceMinor,
      quantity,
      lineTotalMinor: computeLineTotalMinor(unitPriceMinor, quantity),
      notes: rng() < 0.12 ? 'Extra napkins' : null,
      status: shouldVoid ? 'voided' : 'pending',
      isAddition: false,
      voidedAt: shouldVoid ? addMinutes(createdAt, 2) : null,
      voidReason: shouldVoid ? 'Customer changed mind' : null,
      voidedBy: shouldVoid ? actorId : null,
      createdAt,
      modifiers: mods.map((mod, mi) => ({
        id: deterministicUuid('order-item-mod', itemId, String(mi)),
        orgId,
        orderItemId: itemId,
        modifierId: mod.id,
        nameSnapshot: mod.nameSnapshot,
        priceDeltaMinor: mod.priceDeltaMinor,
      })),
    });
  }

  return { items, voidItemId };
}

function computeTotalsFromItems(
  items: PlannedItem[],
  ctx: BranchOrderContext,
): ReturnType<typeof computeOrderTotals> {
  return computeOrderTotals({
    lines: items.map((item) => ({
      lineTotalMinor: item.lineTotalMinor,
      status: item.status,
    })),
    discountMinor: 0,
    taxRateBp: ctx.taxRateBp,
    taxInclusive: ctx.taxInclusive,
  });
}

function syncItemStatusForOrder(items: PlannedItem[], status: OrderStatus): void {
  const target =
    status === 'preparing' ? 'preparing' : status === 'ready' || status === 'completed' ? 'ready' : 'pending';
  for (const item of items) {
    if (item.status === 'voided') {
      continue;
    }
    item.status = target;
  }
}

export function generateBranchOrders(
  ctx: BranchOrderContext,
  options: Pick<DemoSeedCliOptions, 'days' | 'anchor'>,
  anchorIso: string,
): GeneratedBranchOrders {
  const businessDates = listBusinessDates(
    options.anchor,
    options.days,
    ctx.timezone,
    ctx.dayStartHour,
  );
  const todayBusinessDate = computeBusinessDate({
    now: options.anchor,
    timezone: ctx.timezone,
    dayStartHour: ctx.dayStartHour,
  });

  const counterByDate = new Map<string, number>();
  const orders: PlannedOrder[] = [];

  for (const businessDate of businessDates) {
    const dayRng = createDemoRng(anchorIso, `${ctx.branchId}:${businessDate}`);
    const count = ordersForDay(dayRng, businessDate);
    const isToday = businessDate === todayBusinessDate;
    const liveCount = isToday ? Math.min(count, 4 + Math.floor(dayRng() * 5)) : 0;

    for (let n = 1; n <= count; n += 1) {
      const seq = n;
      const orderRng = createDemoRng(anchorIso, `${ctx.branchId}:${businessDate}:${String(seq)}`);
      const prev = counterByDate.get(businessDate) ?? 0;
      const orderNumber = prev + 1;
      counterByDate.set(businessDate, orderNumber);

      const { hour, minute } = pickOrderHour(orderRng);
      const placedAt = dateAtLocalTime(businessDate, hour, minute, ctx.timezone);

      const orderId = deterministicUuid('order', ctx.branchId, businessDate, String(seq));
      const clientOrderId = deterministicUuid('client-order', ctx.branchId, businessDate, String(seq));

      const roll = orderRng();
      const isCancelled = !isToday && roll < 0.05;
      const isLive = isToday && seq > count - liveCount;
      const voidOne = !isCancelled && !isLive && orderRng() < 0.03;
      const splitPay = !isCancelled && !isLive && orderRng() < 0.02;

      let status: OrderStatus = 'placed';
      if (isCancelled) {
        status = 'cancelled';
      } else if (!isLive) {
        status = 'completed';
      } else {
        const livePick = orderRng();
        if (livePick < 0.34) {
          status = 'placed';
        } else if (livePick < 0.67) {
          status = 'preparing';
        } else {
          status = 'ready';
        }
      }

      const dineIn = orderRng() < 0.6 && ctx.tableIds.length > 0;
      const tableId =
        dineIn && ctx.tableIds.length > 0
          ? ctx.tableIds[Math.floor(orderRng() * ctx.tableIds.length)] ?? null
          : null;

      const { items, voidItemId } = buildLines(
        orderRng,
        ctx,
        ctx.orgId,
        orderId,
        placedAt,
        voidOne,
        ctx.cashierMembershipId,
      );

      let totals = computeTotalsFromItems(items, ctx);
      const events: PlannedEvent[] = [];
      const payments: PlannedPayment[] = [];
      let version = 1;
      let paymentStatus = computePaymentStatus(totals.totalMinor, 0);
      let completedAt: Date | null = null;
      let cancelledAt: Date | null = null;
      let cancelReason: string | null = null;

      const pushEvent = (
        type: string,
        fromStatus: OrderStatus | null,
        toStatus: OrderStatus | null,
        payload: Record<string, unknown>,
        at: Date,
      ) => {
        events.push({
          id: deterministicUuid('order-event', orderId, type, at.toISOString()),
          orgId: ctx.orgId,
          orderId,
          type,
          fromStatus,
          toStatus,
          payload,
          actorMembershipId: ctx.cashierMembershipId,
          createdAt: at,
        });
      };

      const itemIds = items.map((it) => it.id);
      pushEvent(ORDER_EVENT_TYPES.placed, null, 'placed', { itemIds }, placedAt);

      if (voidItemId) {
        totals = computeTotalsFromItems(items, ctx);
        paymentStatus = computePaymentStatus(totals.totalMinor, 0);
        version += 1;
        pushEvent(
          ORDER_EVENT_TYPES.itemVoided,
          'placed',
          'placed',
          { itemId: voidItemId, reason: 'Customer changed mind' },
          addMinutes(placedAt, 2),
        );
      }

      if (isCancelled) {
        cancelledAt = addMinutes(placedAt, 3 + Math.floor(orderRng() * 8));
        version += 1;
        cancelReason = 'Customer left';
        pushEvent(
          ORDER_EVENT_TYPES.cancelled,
          'placed',
          'cancelled',
          { reason: cancelReason },
          cancelledAt,
        );
      } else if (isLive) {
        if (status === 'preparing' || status === 'ready') {
          syncItemStatusForOrder(items, 'preparing');
          version += 1;
          pushEvent(
            ORDER_EVENT_TYPES.statusChanged,
            'placed',
            'preparing',
            {},
            addMinutes(placedAt, 3),
          );
        }
        if (status === 'ready') {
          syncItemStatusForOrder(items, 'ready');
          version += 1;
          pushEvent(
            ORDER_EVENT_TYPES.statusChanged,
            'preparing',
            'ready',
            {},
            addMinutes(placedAt, 12),
          );
        }
        if (status === 'ready' && orderRng() < 0.5) {
          const payAt = addMinutes(placedAt, 14);
          const amount = totals.totalMinor;
          const paymentId = deterministicUuid('payment', orderId, '1');
          payments.push({
            id: paymentId,
            orgId: ctx.orgId,
            orderId,
            clientPaymentId: deterministicUuid('client-payment', orderId, '1'),
            method: 'card',
            amountMinor: amount,
            tenderedMinor: null,
            changeMinor: null,
            status: 'captured',
            createdBy: ctx.cashierMembershipId,
            createdAt: payAt,
          });
          version += 1;
          paymentStatus = computePaymentStatus(totals.totalMinor, amount);
          pushEvent(
            ORDER_EVENT_TYPES.paymentCaptured,
            status,
            status,
            {
              paymentId,
              method: 'card',
              amountMinor: amount,
            },
            payAt,
          );
        }
      } else {
        syncItemStatusForOrder(items, 'preparing');
        version += 1;
        const prepAt = addMinutes(placedAt, 2 + Math.floor(orderRng() * 3));
        pushEvent(ORDER_EVENT_TYPES.statusChanged, 'placed', 'preparing', {}, prepAt);

        syncItemStatusForOrder(items, 'ready');
        version += 1;
        const readyAt = addMinutes(prepAt, 5 + Math.floor(orderRng() * 10));
        pushEvent(ORDER_EVENT_TYPES.statusChanged, 'preparing', 'ready', {}, readyAt);

        const due = totals.totalMinor;
        let paid = 0;
        const payAt = addMinutes(readyAt, 1 + Math.floor(orderRng() * 4));

        if (splitPay && due > 2000) {
          const firstAmt = Math.floor(due / 2);
          const secondAmt = due - firstAmt;
          payments.push({
            id: deterministicUuid('payment', orderId, '1'),
            orgId: ctx.orgId,
            orderId,
            clientPaymentId: deterministicUuid('client-payment', orderId, '1'),
            method: 'cash',
            amountMinor: firstAmt,
            tenderedMinor: firstAmt + 500,
            changeMinor: 500,
            status: 'captured',
            createdBy: ctx.cashierMembershipId,
            createdAt: payAt,
          });
          paid += firstAmt;
          version += 1;
          pushEvent(
            ORDER_EVENT_TYPES.paymentCaptured,
            'ready',
            'ready',
            {
              paymentId: payments[0]?.id ?? '',
              method: 'cash',
              amountMinor: firstAmt,
            },
            payAt,
          );
          payments.push({
            id: deterministicUuid('payment', orderId, '2'),
            orgId: ctx.orgId,
            orderId,
            clientPaymentId: deterministicUuid('client-payment', orderId, '2'),
            method: 'card',
            amountMinor: secondAmt,
            tenderedMinor: null,
            changeMinor: null,
            status: 'captured',
            createdBy: ctx.cashierMembershipId,
            createdAt: addMinutes(payAt, 1),
          });
          paid += secondAmt;
          version += 1;
          pushEvent(
            ORDER_EVENT_TYPES.paymentCaptured,
            'ready',
            'ready',
            {
              paymentId: payments[1]?.id ?? '',
              method: 'card',
              amountMinor: secondAmt,
            },
            addMinutes(payAt, 1),
          );
        } else {
          const method = orderRng() < 0.55 ? 'cash' : 'card';
          const amount = due;
          const tendered =
            method === 'cash' ? amount + (500 - (amount % 500)) : null;
          const change =
            method === 'cash' && tendered !== null ? tendered - amount : null;
          payments.push({
            id: deterministicUuid('payment', orderId, '1'),
            orgId: ctx.orgId,
            orderId,
            clientPaymentId: deterministicUuid('client-payment', orderId, '1'),
            method,
            amountMinor: amount,
            tenderedMinor: tendered,
            changeMinor: change,
            status: 'captured',
            createdBy: ctx.cashierMembershipId,
            createdAt: payAt,
          });
          paid = amount;
          version += 1;
          pushEvent(
            ORDER_EVENT_TYPES.paymentCaptured,
            'ready',
            'ready',
            {
              paymentId: payments[0]?.id ?? '',
              method,
              amountMinor: amount,
            },
            payAt,
          );
        }

        paymentStatus = computePaymentStatus(due, paid);
        version += 1;
        completedAt = addMinutes(payAt, 2 + Math.floor(orderRng() * 5));
        syncItemStatusForOrder(items, 'completed');
        pushEvent(
          ORDER_EVENT_TYPES.statusChanged,
          'ready',
          'completed',
          {},
          completedAt,
        );
      }

      orders.push({
        order: {
          id: orderId,
          orgId: ctx.orgId,
          branchId: ctx.branchId,
          clientOrderId,
          orderNumber,
          businessDate,
          type: dineIn ? 'dine_in' : 'takeaway',
          status,
          paymentStatus,
          tableId,
          customerName: orderRng() < 0.2 ? 'Walk-in' : null,
          notes: null,
          subtotalMinor: totals.subtotalMinor,
          discountMinor: totals.discountMinor,
          taxMinor: totals.taxMinor,
          totalMinor: totals.totalMinor,
          currency: ctx.currency,
          cancelReason,
          version,
          placedAt,
          completedAt,
          cancelledAt,
          createdBy: ctx.cashierMembershipId,
          createdAt: placedAt,
          updatedAt: completedAt ?? cancelledAt ?? placedAt,
        },
        items,
        events,
        payments,
      });
    }
  }

  return { branchId: ctx.branchId, orgId: ctx.orgId, counterByDate, orders };
}

export { CHUNK as ORDER_BULK_CHUNK };
