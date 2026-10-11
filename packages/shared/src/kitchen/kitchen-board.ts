import { z } from 'zod';

import {
  orderItemStatusSchema,
  orderStatusSchema,
  orderTypeSchema,
  paymentStatusSchema,
} from '../orders/enums.js';

const localizedNameSchema = z.record(z.string(), z.string());

export const kitchenBoardItemModifierSchema = z.object({
  name: localizedNameSchema,
});

export const kitchenBoardItemSchema = z.object({
  id: z.uuid(),
  name: localizedNameSchema,
  quantity: z.number().int(),
  notes: z.string().nullable(),
  status: orderItemStatusSchema,
  isAddition: z.boolean(),
  createdAt: z.iso.datetime(),
  voidedAt: z.iso.datetime().nullable(),
  voidReason: z.string().nullable(),
  modifiers: z.array(kitchenBoardItemModifierSchema),
});

export type KitchenBoardItem = z.infer<typeof kitchenBoardItemSchema>;

export const kitchenBoardOrderSchema = z.object({
  id: z.uuid(),
  orderNumber: z.number().int().min(1),
  type: orderTypeSchema,
  status: orderStatusSchema,
  version: z.number().int().min(1),
  placedAt: z.iso.datetime(),
  tableLabel: z.string().nullable(),
  customerName: z.string().nullable(),
  notes: z.string().nullable(),
  paymentStatus: paymentStatusSchema,
  items: z.array(kitchenBoardItemSchema),
});

export type KitchenBoardOrder = z.infer<typeof kitchenBoardOrderSchema>;

export const kitchenBoardResponseSchema = z.object({
  serverTime: z.iso.datetime(),
  orders: z.array(kitchenBoardOrderSchema),
});

export type KitchenBoardResponse = z.infer<typeof kitchenBoardResponseSchema>;
