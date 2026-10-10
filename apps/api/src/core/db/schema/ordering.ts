import {
  bigint,
  boolean,
  date,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations, branches } from './tenancy';

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
    customerName: text('customer_name'),
    notes: text('notes'),
    subtotalMinor: bigint('subtotal_minor', { mode: 'number' }).notNull(),
    discountMinor: bigint('discount_minor', { mode: 'number' }).notNull().default(0),
    taxMinor: bigint('tax_minor', { mode: 'number' }).notNull(),
    totalMinor: bigint('total_minor', { mode: 'number' }).notNull(),
    currency: text('currency').notNull(),
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
