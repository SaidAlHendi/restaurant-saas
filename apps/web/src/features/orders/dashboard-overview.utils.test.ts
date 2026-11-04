import { describe, expect, it } from 'vitest';

import { liveCounts, oldestOpenMinutes, percentDelta } from './dashboard-overview.utils.js';

describe('percentDelta', () => {
  it('is null without a previous value', () => {
    expect(percentDelta(10, null)).toBeNull();
    expect(percentDelta(10, 0)).toBeNull();
  });
  it('formats up, down and flat', () => {
    expect(percentDelta(112, 100)).toEqual({ label: '+12%', trend: 'up' });
    expect(percentDelta(90, 100)).toEqual({ label: '-10%', trend: 'down' });
    expect(percentDelta(100, 100)).toEqual({ label: '0%', trend: 'flat' });
  });
});

describe('liveCounts', () => {
  it('counts open, waiting and ready orders', () => {
    const counts = liveCounts([
      { status: 'placed' },
      { status: 'preparing' },
      { status: 'ready' },
      { status: 'completed' },
    ]);
    expect(counts).toEqual({ open: 3, waiting: 1, ready: 1 });
  });
});

describe('oldestOpenMinutes', () => {
  const now = new Date('2026-03-15T12:30:00.000Z');
  it('is null when nothing is open', () => {
    expect(oldestOpenMinutes([{ status: 'completed', createdAt: '2026-03-15T10:00:00.000Z' }], now)).toBeNull();
  });
  it('uses the oldest open order', () => {
    expect(
      oldestOpenMinutes(
        [
          { status: 'placed', createdAt: '2026-03-15T12:20:00.000Z' },
          { status: 'preparing', createdAt: '2026-03-15T12:00:00.000Z' },
        ],
        now,
      ),
    ).toBe(30);
  });
});
