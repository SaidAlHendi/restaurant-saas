import type { PaymentStatus } from '../orders/enums.js';

export function computePaymentStatus(
  totalMinor: number,
  capturedMinor: number,
): PaymentStatus {
  if (totalMinor <= 0) {
    return 'paid';
  }
  const paid = Math.max(0, capturedMinor);
  if (paid <= 0) {
    return 'unpaid';
  }
  if (paid >= totalMinor) {
    return 'paid';
  }
  return 'partial';
}

export function computeDueMinor(totalMinor: number, paidMinor: number): number {
  return Math.max(0, totalMinor - paidMinor);
}
