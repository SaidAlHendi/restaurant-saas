import { z } from 'zod';

export const orderTypeSchema = z.enum(['dine_in', 'takeaway']);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const orderStatusSchema = z.enum([
  'draft',
  'placed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'refunded',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum(['unpaid', 'partial', 'paid', 'refunded']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const orderItemStatusSchema = z.enum(['pending', 'preparing', 'ready', 'voided']);
export type OrderItemStatus = z.infer<typeof orderItemStatusSchema>;
