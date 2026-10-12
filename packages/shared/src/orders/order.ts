import { z } from 'zod';

import { businessDateSchema, inclusiveBusinessDaySpan } from '../dates/business-date.js';
import { moneyMinorSchema } from '../i18n/localized-text.js';
import { cursorListQuerySchema, cursorListResponseSchema } from '../catalog/pagination.js';

import {
  orderItemStatusSchema,
  orderStatusSchema,
  orderTypeSchema,
  paymentStatusSchema,
} from './enums.js';
import { orderLineInputSchema } from './order-line.js';
import { paymentMethodSchema, paymentSchema } from './payment.js';

export const createOrderBodySchema = z
  .object({
    clientOrderId: z.uuid(),
    type: orderTypeSchema,
    tableId: z.uuid().optional(),
    customerName: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z.array(orderLineInputSchema).min(1).max(100),
  })
  .superRefine((body, ctx) => {
    if (body.type === 'dine_in' && body.tableId === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'tableId is required for dine_in',
        path: ['tableId'],
      });
    }
    if (body.type === 'takeaway' && body.tableId !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'tableId is forbidden for takeaway',
        path: ['tableId'],
      });
    }
  });

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const orderItemModifierSchema = z.object({
  id: z.uuid(),
  modifierId: z.uuid(),
  nameSnapshot: z.record(z.string(), z.string()),
  priceDeltaMinor: moneyMinorSchema,
});

export const orderItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productNameSnapshot: z.record(z.string(), z.string()),
  unitPriceMinor: moneyMinorSchema,
  quantity: z.number().int(),
  lineTotalMinor: moneyMinorSchema,
  notes: z.string().nullable(),
  status: orderItemStatusSchema,
  isAddition: z.boolean(),
  voidedAt: z.iso.datetime().nullable(),
  voidReason: z.string().nullable(),
  modifiers: z.array(orderItemModifierSchema),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderMoneySchema = z.object({
  subtotalMinor: moneyMinorSchema,
  discountMinor: moneyMinorSchema,
  taxMinor: moneyMinorSchema,
  totalMinor: moneyMinorSchema,
  currency: z.string().length(3),
});

export const orderPaymentSummarySchema = z.object({
  paidMinor: moneyMinorSchema,
  dueMinor: moneyMinorSchema,
});

export const orderSchema = orderMoneySchema.extend({
  id: z.uuid(),
  orgId: z.uuid(),
  branchId: z.uuid(),
  clientOrderId: z.uuid(),
  orderNumber: z.number().int().min(1),
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: orderTypeSchema,
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  paidMinor: moneyMinorSchema,
  dueMinor: moneyMinorSchema,
  tableId: z.uuid().nullable(),
  customerName: z.string().nullable(),
  notes: z.string().nullable(),
  version: z.number().int().min(1),
  placedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  cancelReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Order = z.infer<typeof orderSchema>;

export const orderDetailSchema = orderSchema.extend({
  items: z.array(orderItemSchema),
  payments: z.array(paymentSchema),
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderListItemSchema = orderSchema.extend({
  itemCount: z.number().int().min(0),
  tableLabel: z.string().nullable(),
  paymentMethods: z.array(paymentMethodSchema),
});

export type OrderListItem = z.infer<typeof orderListItemSchema>;

export const orderListQuerySchema = cursorListQuerySchema
  .extend({
    status: orderStatusSchema.optional(),
    businessDate: businessDateSchema.optional(),
    dateFrom: businessDateSchema.optional(),
    dateTo: businessDateSchema.optional(),
    type: orderTypeSchema.optional(),
    paymentMethod: paymentMethodSchema.optional(),
    activeOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    todayOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    q: z.string().trim().min(1).max(50).optional(),
  })
  .superRefine((query, ctx) => {
    const { dateFrom, dateTo } = query;
    if (dateFrom === undefined || dateTo === undefined) {
      return;
    }
    if (dateFrom > dateTo) {
      ctx.addIssue({
        code: 'custom',
        message: 'dateFrom must be on or before dateTo',
        path: ['dateFrom'],
      });
      return;
    }
    if (inclusiveBusinessDaySpan(dateFrom, dateTo) > 92) {
      ctx.addIssue({
        code: 'custom',
        message: 'Date range must not exceed 92 days',
        path: ['dateTo'],
      });
    }
  });

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const orderListResponseSchema = cursorListResponseSchema(orderListItemSchema);

export const changeOrderStatusBodySchema = z.object({
  to: orderStatusSchema,
  expectedVersion: z.number().int().min(1),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type ChangeOrderStatusBody = z.infer<typeof changeOrderStatusBodySchema>;

export const addOrderItemsBodySchema = z.object({
  expectedVersion: z.number().int().min(1),
  items: z.array(orderLineInputSchema).min(1).max(100),
});

export type AddOrderItemsBody = z.infer<typeof addOrderItemsBodySchema>;

export const voidOrderItemBodySchema = z.object({
  expectedVersion: z.number().int().min(1),
  reason: z.string().trim().min(1).max(500),
});

export type VoidOrderItemBody = z.infer<typeof voidOrderItemBodySchema>;

export const orderEventSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  type: z.string(),
  fromStatus: orderStatusSchema.nullable(),
  toStatus: orderStatusSchema.nullable(),
  payload: z.record(z.string(), z.unknown()),
  actorMembershipId: z.uuid(),
  actorName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type OrderEvent = z.infer<typeof orderEventSchema>;

export const orderEventListResponseSchema = z.object({
  items: z.array(orderEventSchema),
});
