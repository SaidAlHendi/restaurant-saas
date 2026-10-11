import { describe, expect, it } from 'vitest';

import { orderListQuerySchema } from './order.js';

describe('orderListQuerySchema activeOnly', () => {
  it('parses true and false strings strictly', () => {
    expect(orderListQuerySchema.parse({ activeOnly: 'true' }).activeOnly).toBe(true);
    expect(orderListQuerySchema.parse({ activeOnly: 'false' }).activeOnly).toBe(false);
  });

  it('leaves activeOnly undefined when omitted', () => {
    expect(orderListQuerySchema.parse({ limit: 20 }).activeOnly).toBeUndefined();
  });
});
