import { createHmac } from 'node:crypto';

import type { PlanKey } from '@app/shared';

export const TEST_PADDLE_SECRET = 'test-paddle-webhook-secret-e2e';
export const TEST_PRICE_MENU = 'pri_test_menu';
export const TEST_PRICE_RESTAURANT = 'pri_test_restaurant';
export const TEST_PRICE_BUSINESS = 'pri_test_business';
export const TEST_PADDLE_API_KEY = 'test-paddle-api-key';

export const paddleEnvEnabled = {
  PADDLE_ENV: 'sandbox',
  PADDLE_API_KEY: TEST_PADDLE_API_KEY,
  PADDLE_WEBHOOK_SECRET: TEST_PADDLE_SECRET,
  PADDLE_PRICE_MENU: TEST_PRICE_MENU,
  PADDLE_PRICE_RESTAURANT: TEST_PRICE_RESTAURANT,
  PADDLE_PRICE_BUSINESS: TEST_PRICE_BUSINESS,
} as const;

export function priceIdForTestPlan(planKey: Exclude<PlanKey, 'free'>): string {
  if (planKey === 'menu') {
    return TEST_PRICE_MENU;
  }
  if (planKey === 'restaurant') {
    return TEST_PRICE_RESTAURANT;
  }
  return TEST_PRICE_BUSINESS;
}

export function signPaddleBody(
  rawBody: string,
  secret: string,
  tsSeconds: number,
): string {
  const h1 = createHmac('sha256', secret)
    .update(`${String(tsSeconds)}:${rawBody}`)
    .digest('hex');
  return `ts=${String(tsSeconds)};h1=${h1}`;
}

export function subscriptionEventPayload(opts: {
  eventId: string;
  eventType: string;
  occurredAt: string;
  orgId: string | null;
  subscriptionId: string;
  customerId?: string;
  status: string;
  priceId: string;
  quantity?: number;
  currentPeriodEnd?: string;
  canceledAt?: string | null;
}): Record<string, unknown> {
  const customData =
    opts.orgId === null ? {} : { custom_data: { orgId: opts.orgId } };
  return {
    event_id: opts.eventId,
    event_type: opts.eventType,
    occurred_at: opts.occurredAt,
    data: {
      id: opts.subscriptionId,
      customer_id: opts.customerId ?? 'ctm_test_1',
      status: opts.status,
      ...customData,
      current_billing_period: opts.currentPeriodEnd
        ? { ends_at: opts.currentPeriodEnd }
        : undefined,
      canceled_at: opts.canceledAt ?? null,
      items: [{ price: { id: opts.priceId }, quantity: opts.quantity ?? 1 }],
    },
  };
}
