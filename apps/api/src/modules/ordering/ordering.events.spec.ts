import {
  ORDER_EVENT_TYPES,
  changeForOrderEvent,
  realtimeTypeForOrderEvent,
} from './ordering.events';

describe('ordering.events', () => {
  it('maps every order event type to a realtime change', () => {
    for (const eventType of Object.values(ORDER_EVENT_TYPES)) {
      expect(changeForOrderEvent(eventType)).toBeDefined();
    }
    expect(changeForOrderEvent(ORDER_EVENT_TYPES.placed)).toBe('placed');
    expect(changeForOrderEvent(ORDER_EVENT_TYPES.statusChanged)).toBe('status');
    expect(changeForOrderEvent(ORDER_EVENT_TYPES.itemsAdded)).toBe('items_added');
    expect(changeForOrderEvent(ORDER_EVENT_TYPES.itemVoided)).toBe('item_voided');
    expect(changeForOrderEvent(ORDER_EVENT_TYPES.itemStatusChanged)).toBe('item_status');
    expect(changeForOrderEvent(ORDER_EVENT_TYPES.cancelled)).toBe('cancelled');
    expect(changeForOrderEvent(ORDER_EVENT_TYPES.paymentCaptured)).toBe('payment');
  });

  it('maps order event types to socket event names', () => {
    expect(realtimeTypeForOrderEvent(ORDER_EVENT_TYPES.placed)).toBe('order.placed');
    expect(realtimeTypeForOrderEvent(ORDER_EVENT_TYPES.itemVoided)).toBe('order.item_updated');
    expect(realtimeTypeForOrderEvent(ORDER_EVENT_TYPES.itemStatusChanged)).toBe('order.item_updated');
    expect(realtimeTypeForOrderEvent(ORDER_EVENT_TYPES.statusChanged)).toBe('order.updated');
    expect(realtimeTypeForOrderEvent(ORDER_EVENT_TYPES.paymentCaptured)).toBe('order.updated');
  });
});
