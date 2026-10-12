import type { OrderStatus } from '@app/shared';

/** Show "sent to kitchen" only when full payment moved a draft to placed. */
export function shouldShowSentToKitchenToast(
  statusBeforePayment: OrderStatus | null,
  statusAfterPayment: OrderStatus,
): boolean {
  return statusBeforePayment === 'draft' && statusAfterPayment === 'placed';
}
