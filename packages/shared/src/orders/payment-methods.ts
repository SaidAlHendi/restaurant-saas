import type { PaymentMethod } from './payment.js';

export const PAYMENT_METHODS_SORTED: readonly PaymentMethod[] = ['cash', 'card', 'other'];

export function sortPaymentMethods(methods: Iterable<PaymentMethod>): PaymentMethod[] {
  const set = new Set(methods);
  return PAYMENT_METHODS_SORTED.filter((m) => set.has(m));
}
