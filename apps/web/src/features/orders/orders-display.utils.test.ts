import { describe, expect, it } from 'vitest';

import { orderStatusBadgeTone } from './orders-display.utils.js';

describe('orderStatusBadgeTone', () => {
  it('maps order statuses to badge colors', () => {
    expect(orderStatusBadgeTone('placed')).toBe('new');
    expect(orderStatusBadgeTone('preparing')).toBe('preparing');
    expect(orderStatusBadgeTone('ready')).toBe('ready');
    expect(orderStatusBadgeTone('refunded')).toBe('completed');
    expect(orderStatusBadgeTone('cancelled')).toBe('cancelled');
  });
});
