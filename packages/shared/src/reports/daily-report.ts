import { z } from 'zod';

import { moneyMinorSchema } from '../i18n/localized-text.js';
import { orderTypeSchema } from '../orders/enums.js';
import { paymentMethodSchema } from '../orders/payment.js';

export const dailyReportQuerySchema = z.object({
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type DailyReportQuery = z.infer<typeof dailyReportQuerySchema>;

export const dailyReportByTypeSchema = z.object({
  type: orderTypeSchema,
  ordersCount: z.number().int().min(0),
  salesMinor: moneyMinorSchema,
});

export const dailyReportByPaymentMethodSchema = z.object({
  method: paymentMethodSchema,
  paymentsCount: z.number().int().min(0),
  amountMinor: moneyMinorSchema,
});

export const dailyReportTopItemSchema = z.object({
  productId: z.uuid(),
  nameSnapshot: z.record(z.string(), z.string()),
  quantity: z.number().int().min(0),
  revenueMinor: moneyMinorSchema,
});

export const dailyReportSchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string(),
  currency: z.string().length(3),
  salesMinor: moneyMinorSchema,
  taxMinor: moneyMinorSchema,
  ordersCount: z.number().int().min(0),
  averageTicketMinor: moneyMinorSchema,
  paidMinor: moneyMinorSchema,
  unpaidMinor: moneyMinorSchema,
  cancelledCount: z.number().int().min(0),
  draftCount: z.number().int().min(0),
  byType: z.array(dailyReportByTypeSchema).length(2),
  byPaymentMethod: z.array(dailyReportByPaymentMethodSchema).length(3),
  topItems: z.array(dailyReportTopItemSchema).max(10),
});

export type DailyReport = z.infer<typeof dailyReportSchema>;
