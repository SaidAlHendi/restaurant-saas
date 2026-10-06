import { describe, expect, it, vi } from 'vitest';

import { RefreshMutex } from './refresh-mutex.js';

describe('RefreshMutex', () => {
  it('runs a single refresh for concurrent callers', async () => {
    const mutex = new RefreshMutex();
    const refresh = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'new-token';
    });

    const [a, b] = await Promise.all([mutex.run(refresh), mutex.run(refresh)]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(a).toBe('new-token');
    expect(b).toBe('new-token');
    expect(mutex.isLocked()).toBe(false);
  });
});
