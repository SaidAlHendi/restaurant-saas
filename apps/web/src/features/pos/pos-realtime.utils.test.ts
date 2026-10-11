import { describe, expect, it } from 'vitest';

import { posOrderTagsForEvent } from './pos-realtime.utils.js';

const BRANCH = '00000000-0000-4000-8000-0000000000b1';
const ORDER = '00000000-0000-4000-8000-000000000001';
const event = (version: number, branchId = BRANCH) => ({
  orderId: ORDER,
  branchId,
  status: 'preparing' as const,
  version,
});

describe('posOrderTagsForEvent', () => {
  it('refreshes the order and the list for a newer or unknown order', () => {
    const expected = [
      { type: 'Order', id: ORDER },
      { type: 'Order', id: 'LIST' },
    ];
    expect(posOrderTagsForEvent([{ id: ORDER, version: 2 }], event(3), BRANCH)).toEqual(expected);
    expect(posOrderTagsForEvent([], event(1), BRANCH)).toEqual(expected);
  });

  it('ignores versions it already has and other branches', () => {
    expect(posOrderTagsForEvent([{ id: ORDER, version: 3 }], event(3), BRANCH)).toEqual([]);
    expect(
      posOrderTagsForEvent([], event(9, '00000000-0000-4000-8000-0000000000b2'), BRANCH),
    ).toEqual([]);
  });
});
