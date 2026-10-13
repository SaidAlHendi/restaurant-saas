import { computeDueMinor } from '@app/shared';
import type {
  DiningTable,
  DiningTableWithToken,
  KitchenBoardResponse,
  Order,
  OrderDetail,
  OrderEvent,
  OrderListItem,
  Payment,
  PaymentMethod,
} from '@app/shared';

import type {
  diningTables,
  orderEvents,
  orderItemModifiers,
  orderItems,
  orders,
  payments,
} from '../../core/db/schema/ordering';

type OrderRow = typeof orders.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;
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

export function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    method: row.method,
    amountMinor: row.amountMinor,
    tenderedMinor: row.tenderedMinor,
    changeMinor: row.changeMinor,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapOrder(row: OrderRow, paidMinor: number): Order {
  const dueMinor = computeDueMinor(row.totalMinor, paidMinor);
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
    paidMinor,
    dueMinor,
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
  paymentRows: PaymentRow[],
  paidMinor: number,
): OrderDetail {
  return {
    ...mapOrder(row, paidMinor),
    items: items.map(({ item, modifiers }) => mapOrderItem(item, modifiers)),
    payments: paymentRows.map(mapPayment),
  };
}

export function mapOrderListItem(
  row: OrderRow,
  itemCount: number,
  paidMinor: number,
  tableLabel: string | null,
  paymentMethods: PaymentMethod[],
): OrderListItem {
  return {
    ...mapOrder(row, paidMinor),
    itemCount,
    tableLabel,
    paymentMethods,
  };
}

export function mapOrderEvent(
  row: EventRow,
  actorName: string | null,
  approverName: string | null,
): OrderEvent {
  return {
    id: row.id,
    orderId: row.orderId,
    type: row.type,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    payload: row.payload as Record<string, unknown>,
    actorMembershipId: row.actorMembershipId,
    actorName,
    approvedByMembershipId: row.approvedByMembershipId,
    approverName,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapKitchenBoardResponse(input: {
  serverTime: string;
  orderRows: OrderRow[];
  itemRows: ItemRow[];
  modifierRows: ModifierRow[];
  labelByTableId: Map<string, string>;
}): KitchenBoardResponse {
  const modifiersByItem = new Map<string, ModifierRow[]>();
  for (const mod of input.modifierRows) {
    const list = modifiersByItem.get(mod.orderItemId) ?? [];
    list.push(mod);
    modifiersByItem.set(mod.orderItemId, list);
  }
  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const item of input.itemRows) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return {
    serverTime: input.serverTime,
    orders: input.orderRows.map((row) => {
      const placedAt = row.placedAt ?? row.createdAt;
      const tableLabel =
        row.tableId !== null ? (input.labelByTableId.get(row.tableId) ?? null) : null;
      const items = itemsByOrder.get(row.id) ?? [];
      return {
        id: row.id,
        orderNumber: row.orderNumber,
        type: row.type,
        status: row.status,
        version: row.version,
        placedAt: placedAt.toISOString(),
        tableLabel,
        customerName: row.customerName,
        notes: row.notes,
        paymentStatus: row.paymentStatus,
        items: items.map((item) => ({
          id: item.id,
          name: item.productNameSnapshot as Record<string, string>,
          quantity: item.quantity,
          notes: item.notes,
          status: item.status,
          isAddition: item.isAddition,
          createdAt: item.createdAt.toISOString(),
          voidedAt: iso(item.voidedAt),
          voidReason: item.voidReason,
          modifiers: (modifiersByItem.get(item.id) ?? []).map((m) => ({
            name: m.nameSnapshot as Record<string, string>,
          })),
        })),
      };
    }),
  };
}

