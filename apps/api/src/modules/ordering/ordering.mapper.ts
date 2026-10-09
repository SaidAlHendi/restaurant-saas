import type {
  DiningTable,
  DiningTableWithToken,
  Order,
  OrderDetail,
  OrderEvent,
  OrderListItem,
} from '@app/shared';

import type {
  diningTables,
  orderEvents,
  orderItemModifiers,
  orderItems,
  orders,
} from '../../core/db/schema/ordering';

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;
type ModifierRow = typeof orderItemModifiers.$inferSelect;
type EventRow = typeof orderEvents.$inferSelect;

type DiningTableRow = typeof diningTables.$inferSelect;

export function mapDiningTable(
  row: DiningTableRow,
  includeQrToken: boolean,
): DiningTable | DiningTableWithToken {
  const base: DiningTable = {
    id: row.id,
    orgId: row.orgId,
    branchId: row.branchId,
    label: row.label,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (includeQrToken) {
    return { ...base, qrToken: row.qrToken };
  }
  return base;
}

function iso(d: Date | null | undefined): string | null {
  if (!d) {
    return null;
  }
  return d.toISOString();
}

function businessDateString(d: string | Date): string {
  if (typeof d === 'string') {
    return d.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orgId: row.orgId,
    branchId: row.branchId,
    clientOrderId: row.clientOrderId,
    orderNumber: row.orderNumber,
    businessDate: businessDateString(row.businessDate),
    type: row.type,
    status: row.status,
    paymentStatus: row.paymentStatus,
    tableId: row.tableId,
    customerName: row.customerName,
    notes: row.notes,
    subtotalMinor: row.subtotalMinor,
    discountMinor: row.discountMinor,
    taxMinor: row.taxMinor,
    totalMinor: row.totalMinor,
    currency: row.currency,
    version: row.version,
    placedAt: iso(row.placedAt),
    completedAt: iso(row.completedAt),
    cancelledAt: iso(row.cancelledAt),
    cancelReason: row.cancelReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapOrderItem(row: ItemRow, modifiers: ModifierRow[]) {
  return {
    id: row.id,
    productId: row.productId,
    productNameSnapshot: row.productNameSnapshot as Record<string, string>,
    unitPriceMinor: row.unitPriceMinor,
    quantity: row.quantity,
    lineTotalMinor: row.lineTotalMinor,
    notes: row.notes,
    status: row.status,
    isAddition: row.isAddition,
    voidedAt: iso(row.voidedAt),
    voidReason: row.voidReason,
    modifiers: modifiers.map((m) => ({
      id: m.id,
      modifierId: m.modifierId,
      nameSnapshot: m.nameSnapshot as Record<string, string>,
      priceDeltaMinor: m.priceDeltaMinor,
    })),
  };
}

export function mapOrderDetail(
  row: OrderRow,
  items: Array<{ item: ItemRow; modifiers: ModifierRow[] }>,
): OrderDetail {
  return {
    ...mapOrder(row),
    items: items.map(({ item, modifiers }) => mapOrderItem(item, modifiers)),
  };
}

export function mapOrderListItem(row: OrderRow, itemCount: number): OrderListItem {
  return {
    ...mapOrder(row),
    itemCount,
  };
}

export function mapOrderEvent(row: EventRow): OrderEvent {
  return {
    id: row.id,
    orderId: row.orderId,
    type: row.type,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    payload: row.payload as Record<string, unknown>,
    actorMembershipId: row.actorMembershipId,
    createdAt: row.createdAt.toISOString(),
  };
}

