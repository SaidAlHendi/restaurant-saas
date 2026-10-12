import { describe, expect, it } from 'vitest';

import { orderListQuerySchema } from './order.js';

describe('orderListQuerySchema', () => {
  it('rejects dateFrom after dateTo', () => {
    const result = orderListQuerySchema.safeParse({
      dateFrom: '2026-03-01',
      dateTo: '2026-02-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects inclusive range over 92 days', () => {
    const result = orderListQuerySchema.safeParse({
      dateFrom: '2026-01-01',
      dateTo: '2026-04-05',
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 92 inclusive days', () => {
    const result = orderListQuerySchema.safeParse({
      dateFrom: '2026-01-01',
      dateTo: '2026-04-02',
    });
    expect(result.success).toBe(true);
  });
});
