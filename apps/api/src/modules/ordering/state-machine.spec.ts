import { BusinessRuleError } from '../../core/errors/app-errors';

import {
  ALL_ORDER_STATUSES,
  assertReopenTransition,
  assertTransition,
  assertUndoTransition,
  findTransition,
  itemStatusForNotReady,
} from './state-machine';

describe('order state machine', () => {
  const targets: typeof ALL_ORDER_STATUSES = ALL_ORDER_STATUSES;

  it('maps not_ready item targets from order status', () => {
    expect(itemStatusForNotReady('placed')).toBe('pending');
    expect(itemStatusForNotReady('preparing')).toBe('preparing');
    expect(() => itemStatusForNotReady('ready')).toThrow(BusinessRuleError);
  });

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
          (from === 'draft' && to === 'cancelled') ||
          (from === 'placed' && to === 'preparing') ||
          (from === 'preparing' && to === 'ready') ||
          (from === 'placed' && to === 'ready') ||
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

describe('undo transitions', () => {
  it('only ready -> preparing and completed -> ready are undoable', () => {
    expect(assertUndoTransition('ready', 'preparing').permission).toBe('orders.update_status');
    expect(assertUndoTransition('completed', 'ready').permission).toBe('orders.update_status');
    expect(() => assertUndoTransition('placed', 'draft')).toThrow(BusinessRuleError);
    expect(() => assertUndoTransition('completed', 'preparing')).toThrow(BusinessRuleError);
  });

  it('the reverse moves stay invalid without undo', () => {
    expect(findTransition('ready', 'preparing')).toBeUndefined();
    expect(findTransition('completed', 'ready')).toBeUndefined();
  });
});

describe('reopen transition', () => {
  it('is only completed -> ready and needs orders.reopen', () => {
    expect(assertReopenTransition('completed', 'ready').permission).toBe('orders.reopen');
    for (const from of ALL_ORDER_STATUSES.filter((s) => s !== 'completed')) {
      expect(() => assertReopenTransition(from, 'ready')).toThrow(BusinessRuleError);
    }
    expect(() => assertReopenTransition('completed', 'preparing')).toThrow(BusinessRuleError);
  });
});
