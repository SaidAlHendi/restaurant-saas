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
  })
  .superRefine((body, ctx) => {
    if (body.method === 'cash') {
      if (body.tenderedMinor === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'tenderedMinor is required for cash',
          path: ['tenderedMinor'],
        });
      }
      return;
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
  createdAt: z.iso.datetime(),
});

export type Payment = z.infer<typeof paymentSchema>;
