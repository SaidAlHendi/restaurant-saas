import { describe, expect, it } from 'vitest';

import type { OrderEvent } from '@app/shared';

import { mapOrderEventToTimelineRow } from './order-event-timeline.utils.js';

function baseEvent(overrides: Partial<OrderEvent>): OrderEvent {
  return {
    id: '01932a1a-7b3e-7000-8000-000000000099',
    orderId: '01932a1a-7b3e-7000-8000-000000000040',
    type: 'order.placed',
    fromStatus: null,
    toStatus: null,
    payload: {},
    actorMembershipId: '01932a1a-7b3e-7000-8000-000000000088',
    actorName: 'Alex',
    approvedByMembershipId: null,
    approverName: null,
    createdAt: '2026-03-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('mapOrderEventToTimelineRow', () => {
  it('maps known event types', () => {
    expect(mapOrderEventToTimelineRow(baseEvent({ type: 'order.drafted' })).labelKey).toBe(
      'order.events.drafted',
    );
    expect(mapOrderEventToTimelineRow(baseEvent({ type: 'order.placed' })).labelKey).toBe(
      'order.events.placed',
    );
    expect(
      mapOrderEventToTimelineRow(
        baseEvent({
          type: 'order.status_changed',
          fromStatus: 'placed',
          toStatus: 'preparing',
        }),
      ).labelKey,
    ).toBe('order.events.statusChanged');
    expect(
      mapOrderEventToTimelineRow(
        baseEvent({ type: 'order.items_added', payload: { itemIds: ['a', 'b'] } }),
      ).labelParams,
    ).toEqual({ count: 2 });
    expect(mapOrderEventToTimelineRow(baseEvent({ type: 'order.cancelled' })).labelKey).toBe(
      'order.events.cancelled',
    );
    expect(
      mapOrderEventToTimelineRow(
        baseEvent({ type: 'order.cancelled', approverName: 'Manager Mo' }),
      ).approverName,
    ).toBe('Manager Mo');
    expect(mapOrderEventToTimelineRow(baseEvent({ type: 'payment.captured' })).labelKey).toBe(
      'order.events.paymentCaptured',
    );
  });

  it('maps unknown types to fallback', () => {
    const event = { ...baseEvent({}), type: 'order.custom_future' };
    const row = mapOrderEventToTimelineRow(event);
    expect(row.labelKey).toBe('order.events.unknown');
    expect(row.labelParams).toEqual({ type: 'order.custom_future' });
  });

  it('labels a reopen, with its reason', () => {
    const row = mapOrderEventToTimelineRow(
      baseEvent({
        type: 'order.status_changed',
        fromStatus: 'completed',
        toStatus: 'ready',
        payload: { reopen: true, reason: 'Wrong table' },
      }),
    );
    expect(row.labelKey).toBe('order.events.reopened');
    expect(row.icon).toBe('reopen');
    expect(row.reason).toBe('Wrong table');
  });

  it('labels an undo and a handover', () => {
    const undo = mapOrderEventToTimelineRow(
      baseEvent({ type: 'order.status_changed', toStatus: 'preparing', payload: { undo: true } }),
    );
    expect(undo.labelKey).toBe('order.events.undone');
    expect(undo.icon).toBe('undo');
    const handover = mapOrderEventToTimelineRow(
      baseEvent({ type: 'order.status_changed', toStatus: 'completed', payload: { handover: true } }),
    );
    expect(handover.labelKey).toBe('order.events.handedOver');
  });

  it('carries the cancel reason separately', () => {
    const row = mapOrderEventToTimelineRow(
      baseEvent({ type: 'order.cancelled', payload: { reason: 'Guest left' } }),
    );
    expect(row.reason).toBe('Guest left');
  });
});
