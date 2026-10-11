import { z } from 'zod';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { randomUuid } from './uuid.js';

describe('randomUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when available', () => {
    const fixed = '01932a1a-7b3e-7000-8000-000000000099';
    vi.stubGlobal('crypto', {
      randomUUID: () => fixed,
      getRandomValues: (arr: Uint8Array) => {
        arr.fill(0);
        return arr;
      },
    });
    expect(randomUuid()).toBe(fixed);
    expect(z.uuid().safeParse(fixed).success).toBe(true);
  });

  it('falls back to getRandomValues when randomUUID is missing', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i += 1) {
          arr[i] = i;
        }
        return arr;
      },
    });
    const id = randomUuid();
    expect(z.uuid().safeParse(id).success).toBe(true);
    expect(id).not.toBe('00000000-0000-4000-8000-000000000000');
  });
});
