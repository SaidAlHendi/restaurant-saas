import { z } from 'zod';

import { moneyMinorSchema } from '../i18n/localized-text.js';

export const paymentMethodSchema = z.enum(['cash', 'card', 'other']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentRecordStatusSchema = z.enum(['captured', 'refunded']);
export type PaymentRecordStatus = z.infer<typeof paymentRecordStatusSchema>;

export const createPaymentBodySchema = z
  .object({
    clientPaymentId: z.uuid(),
    expectedVersion: z.number().int().min(1),
    method: paymentMethodSchema,
    amountMinor: moneyMinorSchema,
    tenderedMinor: moneyMinorSchema.optional(),
    /**
     * Cash handed over, in the order's display currency (minor units). Required for cash when the
     * order has a display currency; the server derives `tenderedMinor` from it.
     */
    displayTenderedMinor: moneyMinorSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.method === 'cash') {
      if (body.tenderedMinor === undefined && body.displayTenderedMinor === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'tenderedMinor is required for cash',
          path: ['tenderedMinor'],
        });
      }
      return;
    }
    if (body.displayTenderedMinor !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'displayTenderedMinor is only allowed for cash',
        path: ['displayTenderedMinor'],
      });
    }
    if (body.tenderedMinor !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'tenderedMinor is only allowed for cash',
        path: ['tenderedMinor'],
      });
    }
  });

export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;

export const paymentSchema = z.object({
  id: z.uuid(),
  method: paymentMethodSchema,
  amountMinor: moneyMinorSchema,
  tenderedMinor: moneyMinorSchema.nullable(),
  changeMinor: moneyMinorSchema.nullable(),
  /** Cash handed over and change given, in the order's display currency; `null` without one. */
  displayTenderedMinor: moneyMinorSchema.nullable().default(null),
  displayChangeMinor: moneyMinorSchema.nullable().default(null),
  createdAt: z.iso.datetime(),
});

export type Payment = z.infer<typeof paymentSchema>;
