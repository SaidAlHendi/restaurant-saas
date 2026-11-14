import { z } from 'zod';

import { moneyMinorSchema } from '../i18n/localized-text.js';
import { moneyDisplaySchema } from '../money/display-currency.js';

import { orderStatusSchema, orderItemStatusSchema } from './enums.js';
import { paymentMethodSchema } from './payment.js';

export const billStatusSchema = z.enum(['open', 'closed']);
export type BillStatus = z.infer<typeof billStatusSchema>;

export const billItemSchema = z.object({
  id: z.uuid(),
  productNameSnapshot: z.record(z.string(), z.string()),
  quantity: z.number().int(),
  lineTotalMinor: moneyMinorSchema,
  /** Exact amount this item contributes to the order total (tax and discount included). */
  shareMinor: moneyMinorSchema,
  paidMinor: moneyMinorSchema,
  seat: z.string().nullable(),
  status: orderItemStatusSchema,
  voided: z.boolean(),
});
export type BillItem = z.infer<typeof billItemSchema>;

export const billOrderSchema = z.object({
  id: z.uuid(),
  orderNumber: z.number().int(),
  status: orderStatusSchema,
  round: z.number().int().min(1),
  version: z.number().int(),
  totalMinor: moneyMinorSchema,
  paidMinor: moneyMinorSchema,
  dueMinor: moneyMinorSchema,
  createdAt: z.iso.datetime(),
  items: z.array(billItemSchema),
});
export type BillOrder = z.infer<typeof billOrderSchema>;

export const billSchema = z.object({
  id: z.uuid(),
  branchId: z.uuid(),
  tableId: z.uuid(),
  tableLabel: z.string().nullable(),
  label: z.string().nullable(),
  status: billStatusSchema,
  version: z.number().int(),
  currency: z.string().length(3),
  /** Display currency of the bill's first order, used to show amounts and take cash. */
  display: moneyDisplaySchema.nullable().default(null),
  openedAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  totalMinor: moneyMinorSchema,
  paidMinor: moneyMinorSchema,
  dueMinor: moneyMinorSchema,
  orders: z.array(billOrderSchema),
});
export type Bill = z.infer<typeof billSchema>;

export const billListQuerySchema = z.object({
  tableId: z.uuid().optional(),
  status: billStatusSchema.default('open'),
});
export type BillListQuery = z.infer<typeof billListQuerySchema>;

export const createBillPaymentBodySchema = z
  .object({
    clientPaymentId: z.uuid(),
    method: paymentMethodSchema,
    /** Pay exactly these items (their remaining shares). Without it, pay `amountMinor` oldest first. */
    itemIds: z.array(z.uuid()).min(1).max(200).optional(),
    amountMinor: moneyMinorSchema.optional(),
    tenderedMinor: moneyMinorSchema.optional(),
    displayTenderedMinor: moneyMinorSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.itemIds === undefined && (body.amountMinor === undefined || body.amountMinor <= 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'amountMinor is required without itemIds',
        path: ['amountMinor'],
      });
    }
    if (body.method === 'cash') {
      if (body.tenderedMinor === undefined && body.displayTenderedMinor === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'tenderedMinor is required for cash',
          path: ['tenderedMinor'],
        });
      }
    } else if (body.tenderedMinor !== undefined || body.displayTenderedMinor !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'tendered amounts are only allowed for cash',
        path: ['tenderedMinor'],
      });
    }
  });
export type CreateBillPaymentBody = z.infer<typeof createBillPaymentBodySchema>;

export const billPaymentResultSchema = z.object({
  created: z.boolean(),
  amountMinor: moneyMinorSchema,
  changeMinor: moneyMinorSchema.nullable(),
  bill: billSchema,
});
export type BillPaymentResult = z.infer<typeof billPaymentResultSchema>;
