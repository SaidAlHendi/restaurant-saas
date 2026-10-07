import {
  bigint,
  boolean,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations } from './tenancy';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: jsonb('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('categories_id_org_id_unique').on(t.id, t.orgId)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull(),
    name: jsonb('name').notNull(),
    description: jsonb('description'),
    priceMinor: bigint('price_minor', { mode: 'number' }).notNull(),
    imageKey: text('image_key'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('products_id_org_id_unique').on(t.id, t.orgId),
    foreignKey({
      name: 'products_category_id_org_id_categories_id_org_id_fk',
      columns: [t.categoryId, t.orgId],
      foreignColumns: [categories.id, categories.orgId],
    }),
  ],
);

export const modifierGroups = pgTable(
  'modifier_groups',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: jsonb('name').notNull(),
    minSelect: smallint('min_select').notNull().default(0),
    maxSelect: smallint('max_select').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('modifier_groups_id_org_id_unique').on(t.id, t.orgId),
  ],
);

export const modifiers = pgTable(
  'modifiers',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').notNull(),
    name: jsonb('name').notNull(),
    priceDeltaMinor: bigint('price_delta_minor', { mode: 'number' }).notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'modifiers_group_id_org_id_modifier_groups_id_org_id_fk',
      columns: [t.groupId, t.orgId],
      foreignColumns: [modifierGroups.id, modifierGroups.orgId],
    }).onDelete('cascade'),
  ],
);

export const productModifierGroups = pgTable(
  'product_modifier_groups',
  {
    productId: uuid('product_id').notNull(),
    groupId: uuid('group_id').notNull(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.groupId] }),
    foreignKey({
      name: 'product_modifier_groups_product_id_org_id_products_id_org_id_fk',
      columns: [t.productId, t.orgId],
      foreignColumns: [products.id, products.orgId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'product_modifier_groups_group_id_org_id_modifier_groups_id_org_id_fk',
      columns: [t.groupId, t.orgId],
      foreignColumns: [modifierGroups.id, modifierGroups.orgId],
    }).onDelete('cascade'),
  ],
);
