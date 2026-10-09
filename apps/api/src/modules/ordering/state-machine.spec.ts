import { BusinessRuleError } from '../../core/errors/app-errors';

import { ALL_ORDER_STATUSES, assertTransition, findTransition } from './state-machine';

describe('order state machine', () => {
  const targets: typeof ALL_ORDER_STATUSES = ALL_ORDER_STATUSES;

  it('allows documented transitions with permissions', () => {
    expect(findTransition('placed', 'preparing')?.permission).toBe('orders.update_status');
    expect(findTransition('ready', 'completed')?.permission).toBe('orders.update_status');
    expect(findTransition('preparing', 'cancelled')?.permission).toBe('orders.cancel');
  });

  it('covers every from/to pair deterministically', () => {
    for (const from of ALL_ORDER_STATUSES) {
      for (const to of targets) {
        const transition = findTransition(from, to);
        if (from === to) {
          expect(transition).toBeUndefined();
          continue;
        }
        const allowed =
          (from === 'placed' && to === 'preparing') ||
          (from === 'preparing' && to === 'ready') ||
          (from === 'ready' && to === 'completed') ||
          (from === 'placed' && to === 'cancelled') ||
          (from === 'preparing' && to === 'cancelled') ||
          (from === 'ready' && to === 'cancelled');
        if (allowed) {
          expect(transition).toBeDefined();
          expect(() => assertTransition(from, to)).not.toThrow();
        } else {
          expect(transition).toBeUndefined();
          expect(() => assertTransition(from, to)).toThrow(BusinessRuleError);
        }
      }
    }
  });
});
