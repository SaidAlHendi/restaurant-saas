import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { branches, memberships, organizations } from './tenancy';

export const orderTypeEnum = pgEnum('order_type', ['dine_in', 'takeaway']);

export const orderStatusEnum = pgEnum('order_status', [
  'draft',
  'placed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'refunded',
]);

export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'partial', 'paid', 'refunded']);

export const orderItemStatusEnum = pgEnum('order_item_status', [
  'pending',
  'preparing',
  'ready',
  'voided',
]);

export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'other']);

export const paymentRecordStatusEnum = pgEnum('payment_record_status', ['captured', 'refunded']);

export const diningTables = pgTable(
  'tables',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').notNull(),
    label: text('label').notNull(),
    qrToken: text('qr_token').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('tables_id_org_id_unique').on(t.id, t.orgId),
    unique('tables_branch_label_unique').on(t.branchId, t.label),
    unique('tables_qr_token_unique').on(t.qrToken),
    foreignKey({
      name: 'tables_branch_id_org_id_branches_id_org_id_fk',
      columns: [t.branchId, t.orgId],
      foreignColumns: [branches.id, branches.orgId],
    }).onDelete('restrict'),
  ],
);

export const branchCounters = pgTable(
  'branch_counters',
  {
    branchId: uuid('branch_id').notNull(),
    businessDate: date('business_date').notNull(),
    lastOrderNumber: integer('last_order_number').notNull().default(0),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.branchId, t.businessDate] }),
    foreignKey({
      name: 'branch_counters_branch_id_org_id_branches_id_org_id_fk',
      columns: [t.branchId, t.orgId],
      foreignColumns: [branches.id, branches.orgId],
    }).onDelete('restrict'),
  ],
);

export const billStatusEnum = pgEnum('bill_status', ['open', 'closed']);

/** A table visit: groups the dine-in orders ("rounds") that are paid together. */
export const bills = pgTable(
  'bills',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').notNull(),
    tableId: uuid('table_id').notNull(),
    /** Optional name when two groups share a table ("Group B"). */
    label: text('label'),
    status: billStatusEnum('status').notNull().default('open'),
    openedBy: uuid('opened_by').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    unique('bills_id_org_id_unique').on(t.id, t.orgId),
    foreignKey({
      name: 'bills_branch_id_org_id_branches_id_org_id_fk',
      columns: [t.branchId, t.orgId],
      foreignColumns: [branches.id, branches.orgId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'bills_table_id_org_id_tables_id_org_id_fk',
      columns: [t.tableId, t.orgId],
      foreignColumns: [diningTables.id, diningTables.orgId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'bills_opened_by_memberships_id_fk',
      columns: [t.openedBy],
      foreignColumns: [memberships.id],
    }).onDelete('restrict'),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').notNull(),
    clientOrderId: uuid('client_order_id').notNull(),
    orderNumber: integer('order_number').notNull(),
    businessDate: date('business_date').notNull(),
    type: orderTypeEnum('type').notNull(),
    status: orderStatusEnum('status').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
    tableId: uuid('table_id'),
    /** Set for dine-in orders at a table; null for takeaway and orders from before bills. */
    billId: uuid('bill_id'),
    customerName: text('customer_name'),
    pagerNumber: integer('pager_number'),
    notes: text('notes'),
    subtotalMinor: bigint('subtotal_minor', { mode: 'number' }).notNull(),
    discountMinor: bigint('discount_minor', { mode: 'number' }).notNull().default(0),
    taxMinor: bigint('tax_minor', { mode: 'number' }).notNull(),
    totalMinor: bigint('total_minor', { mode: 'number' }).notNull(),
    currency: text('currency').notNull(),
    /** Display currency frozen at creation (all four set, or all four null). */
    displayCurrency: text('display_currency'),
    exchangeRate: numeric('exchange_rate', { precision: 18, scale: 6, mode: 'number' }),
    displayItemStep: integer('display_item_step'),
    displayTotalStep: integer('display_total_step'),
    cancelReason: text('cancel_reason'),
    version: integer('version').notNull().default(1),
    placedAt: timestamp('placed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('orders_id_org_id_unique').on(t.id, t.orgId),
    unique('orders_branch_client_order_id_unique').on(t.branchId, t.clientOrderId),
    unique('orders_branch_business_date_order_number_unique').on(
      t.branchId,
      t.businessDate,
      t.orderNumber,
    ),
    foreignKey({
      name: 'orders_branch_id_org_id_branches_id_org_id_fk',
      columns: [t.branchId, t.orgId],
      foreignColumns: [branches.id, branches.orgId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'orders_table_id_org_id_tables_id_org_id_fk',
      columns: [t.tableId, t.orgId],
      foreignColumns: [diningTables.id, diningTables.orgId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'orders_bill_id_org_id_bills_id_org_id_fk',
      columns: [t.billId, t.orgId],
      foreignColumns: [bills.id, bills.orgId],
    }).onDelete('restrict'),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').notNull(),
    productId: uuid('product_id').notNull(),
    productNameSnapshot: jsonb('product_name_snapshot').notNull(),
    unitPriceMinor: bigint('unit_price_minor', { mode: 'number' }).notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalMinor: bigint('line_total_minor', { mode: 'number' }).notNull(),
    notes: text('notes'),
    /** Guest label on a shared bill ("Guest 1"), used to pay per person. */
    seat: text('seat'),
    status: orderItemStatusEnum('status').notNull().default('pending'),
    isAddition: boolean('is_addition').notNull().default(false),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    voidedBy: uuid('voided_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('order_items_id_org_id_unique').on(t.id, t.orgId),
    foreignKey({
      name: 'order_items_order_id_org_id_orders_id_org_id_fk',
      columns: [t.orderId, t.orgId],
      foreignColumns: [orders.id, orders.orgId],
    }).onDelete('restrict'),
  ],
);

export const orderItemModifiers = pgTable(
  'order_item_modifiers',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id').notNull(),
    modifierId: uuid('modifier_id').notNull(),
    nameSnapshot: jsonb('name_snapshot').notNull(),
    priceDeltaMinor: bigint('price_delta_minor', { mode: 'number' }).notNull().default(0),
  },
  (t) => [
    foreignKey({
      name: 'order_item_modifiers_order_item_id_org_id_order_items_id_org_id_fk',
      columns: [t.orderItemId, t.orgId],
      foreignColumns: [orderItems.id, orderItems.orgId],
    }).onDelete('restrict'),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').notNull(),
    clientPaymentId: uuid('client_payment_id').notNull(),
    method: paymentMethodEnum('method').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    tenderedMinor: bigint('tendered_minor', { mode: 'number' }),
    changeMinor: bigint('change_minor', { mode: 'number' }),
    displayTenderedMinor: bigint('display_tendered_minor', { mode: 'number' }),
    displayChangeMinor: bigint('display_change_minor', { mode: 'number' }),
    status: paymentRecordStatusEnum('status').notNull().default('captured'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('payments_id_org_id_unique').on(t.id, t.orgId),
    unique('payments_order_client_payment_unique').on(t.orderId, t.clientPaymentId),
    check('payments_amount_positive', sql`${t.amountMinor} > 0`),
    check(
      'payments_tendered_nonneg',
      sql`${t.tenderedMinor} IS NULL OR ${t.tenderedMinor} >= 0`,
    ),
    check('payments_change_nonneg', sql`${t.changeMinor} IS NULL OR ${t.changeMinor} >= 0`),
    foreignKey({
      name: 'payments_order_id_org_id_orders_id_org_id_fk',
      columns: [t.orderId, t.orgId],
      foreignColumns: [orders.id, orders.orgId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'payments_created_by_memberships_id_fk',
      columns: [t.createdBy],
      foreignColumns: [memberships.id],
    }).onDelete('restrict'),
  ],
);

/** Which order items a payment covered, so an item is never paid twice. */
export const paymentItems = pgTable(
  'payment_items',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id').notNull(),
    orderItemId: uuid('order_item_id').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  },
  (t) => [
    check('payment_items_amount_positive', sql`${t.amountMinor} > 0`),
    foreignKey({
      name: 'payment_items_payment_id_org_id_payments_id_org_id_fk',
      columns: [t.paymentId, t.orgId],
      foreignColumns: [payments.id, payments.orgId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'payment_items_order_item_id_org_id_order_items_id_org_id_fk',
      columns: [t.orderItemId, t.orgId],
      foreignColumns: [orderItems.id, orderItems.orgId],
    }).onDelete('restrict'),
  ],
);

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').notNull(),
    type: text('type').notNull(),
    fromStatus: orderStatusEnum('from_status'),
    toStatus: orderStatusEnum('to_status'),
    payload: jsonb('payload').notNull(),
    actorMembershipId: uuid('actor_membership_id').notNull(),
    approvedByMembershipId: uuid('approved_by_membership_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'order_events_order_id_org_id_orders_id_org_id_fk',
      columns: [t.orderId, t.orgId],
      foreignColumns: [orders.id, orders.orgId],
    }).onDelete('restrict'),
  ],
);
