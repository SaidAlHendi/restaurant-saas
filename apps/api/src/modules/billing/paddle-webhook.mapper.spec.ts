import { mapPaddleStatusToOurs, mapPaddleWebhookPayload } from './paddle-webhook.mapper';
import type { PaddlePriceMap } from './paddle-price-map';

const prices: PaddlePriceMap = {
  menu: 'pri_menu',
  restaurant: 'pri_rest',
  business: 'pri_biz',
};

describe('mapPaddleStatusToOurs', () => {
  it.each([
    ['active', 'active'],
    ['activated', 'active'],
    ['trialing', 'trialing'],
    ['past_due', 'past_due'],
    ['canceled', 'canceled'],
    ['cancelled', 'canceled'],
    ['paused', null],
  ] as const)('maps %s', (input, expected) => {
    expect(mapPaddleStatusToOurs(input)).toBe(expected);
  });
});

describe('mapPaddleWebhookPayload', () => {
  it('maps subscription.created price id to restaurant plan', () => {
    const mapped = mapPaddleWebhookPayload(
      {
        event_id: 'evt_1',
        event_type: 'subscription.created',
        occurred_at: '2026-06-01T12:00:00.000Z',
        data: {
          id: 'sub_1',
          customer_id: 'ctm_1',
          status: 'active',
          custom_data: { orgId: '01932a1a-7b3e-7000-8000-000000000010' },
          current_billing_period: { ends_at: '2026-07-01T12:00:00.000Z' },
          items: [{ price: { id: 'pri_rest' }, quantity: 2 }],
        },
      },
      prices,
    );
    expect(mapped).toMatchObject({
      kind: 'subscription',
      planKey: 'restaurant',
      branchQuantity: 2,
      providerSubscriptionId: 'sub_1',
    });
  });

  it('returns null planKey for unknown price id', () => {
    const mapped = mapPaddleWebhookPayload(
      {
        event_id: 'evt_2',
        event_type: 'subscription.updated',
        occurred_at: '2026-06-01T12:00:00.000Z',
        data: {
          id: 'sub_1',
          status: 'active',
          custom_data: { orgId: '01932a1a-7b3e-7000-8000-000000000010' },
          items: [{ price: { id: 'pri_unknown' }, quantity: 1 }],
        },
      },
      prices,
    );
    expect(mapped?.kind).toBe('subscription');
    if (mapped?.kind === 'subscription') {
      expect(mapped.planKey).toBeNull();
      expect(mapped.planId).toBeNull();
    }
  });
});
