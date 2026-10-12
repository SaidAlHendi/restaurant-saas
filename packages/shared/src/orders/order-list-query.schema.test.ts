import { describe, expect, it } from 'vitest';

import { orderListQuerySchema } from './order.js';

describe('orderListQuerySchema business dates', () => {
  it('rejects invalid dateFrom', () => {
    const result = orderListQuerySchema.safeParse({
      limit: 20,
      dateFrom: '2026-02-30',
      dateTo: '2026-03-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid range within 92 days', () => {
    const result = orderListQuerySchema.safeParse({
      limit: 20,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(result.success).toBe(true);
  });
});
