import type { PlanKey } from '@app/shared';

import type { PaddlePriceMap } from './paddle-price-map';
import { planIdForPlanKey, planKeyForPriceId } from './paddle-price-map';

export type MappedSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export function mapPaddleStatusToOurs(status: string): MappedSubscriptionStatus | null {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
    case 'activated':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    default:
      return null;
  }
}

export type MappedSubscriptionEvent = {
  kind: 'subscription';
  eventId: string;
  eventType: string;
  occurredAt: Date;
  orgIdRaw: unknown;
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  status: MappedSubscriptionStatus | null;
  planKey: PlanKey | null;
  planId: string | null;
  priceId: string | null;
  branchQuantity: number;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
  scheduledChange: Record<string, unknown> | null;
};

export type MappedTransactionEvent = {
  kind: 'transaction';
  eventId: string;
  eventType: string;
  occurredAt: Date;
  orgIdRaw: unknown;
  providerCustomerId: string | null;
};

export type MappedWebhookEvent = MappedSubscriptionEvent | MappedTransactionEvent | {
  kind: 'ignored';
  eventId: string;
  eventType: string;
  occurredAt: Date;
  orgIdRaw: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function readCustomDataOrgId(data: Record<string, unknown>): unknown {
  const custom = asRecord(data['custom_data']);
  if (custom === null) {
    return undefined;
  }
  return custom['orgId'];
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapPaddleWebhookPayload(
  payload: unknown,
  priceMap: PaddlePriceMap,
): MappedWebhookEvent | null {
  const root = asRecord(payload);
  if (root === null) {
    return null;
  }
  const eventId = readString(root, 'event_id');
  const eventType = readString(root, 'event_type');
  const occurredAt = parseDate(root['occurred_at']);
  if (eventId === null || eventType === null || occurredAt === null) {
    return null;
  }
  const data = asRecord(root['data']);
  if (data === null) {
    return null;
  }
  const orgIdRaw = readCustomDataOrgId(data);

  if (eventType === 'transaction.completed') {
    return {
      kind: 'transaction',
      eventId,
      eventType,
      occurredAt,
      orgIdRaw,
      providerCustomerId: readString(data, 'customer_id'),
    };
  }

  if (!eventType.startsWith('subscription.')) {
    return {
      kind: 'ignored',
      eventId,
      eventType,
      occurredAt,
      orgIdRaw,
    };
  }

  const providerSubscriptionId = readString(data, 'id');
  if (providerSubscriptionId === null) {
    return null;
  }

  const items = data['items'];
  let priceId: string | null = null;
  let branchQuantity = 1;
  if (Array.isArray(items) && items.length > 0) {
    const first = asRecord(items[0]);
    if (first !== null) {
      const price = asRecord(first['price']);
      priceId = price !== null ? readString(price, 'id') : readString(first, 'price_id');
      const qty = first['quantity'];
      if (typeof qty === 'number' && Number.isInteger(qty) && qty > 0) {
        branchQuantity = qty;
      }
    }
  }

  const planKey = priceId !== null ? planKeyForPriceId(priceMap, priceId) : null;
  const planId =
    planKey !== null && planKey !== 'free' ? planIdForPlanKey(planKey) : null;

  const period = asRecord(data['current_billing_period']);
  const currentPeriodEnd = period !== null ? parseDate(period['ends_at']) : null;

  const scheduled = data['scheduled_change'];
  const scheduledChange = scheduled === null ? null : asRecord(scheduled);

  const paddleStatus = readString(data, 'status') ?? eventType.replace('subscription.', '');
  const trialDates = asRecord(data['trial_dates']);
  const trialEndsAt =
    trialDates !== null
      ? parseDate(trialDates['ends_at'])
      : parseDate(data['trial_ends_at']);

  return {
    kind: 'subscription',
    eventId,
    eventType,
    occurredAt,
    orgIdRaw,
    providerSubscriptionId,
    providerCustomerId: readString(data, 'customer_id'),
    status: mapPaddleStatusToOurs(paddleStatus),
    planKey,
    planId,
    priceId,
    branchQuantity,
    currentPeriodEnd,
    trialEndsAt,
    canceledAt: parseDate(data['canceled_at']),
    scheduledChange,
  };
}
