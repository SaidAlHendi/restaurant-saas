import { describe, expect, it } from 'vitest';

import { clientIp, createRateLimiter } from './rate-limit.server.js';

describe('createRateLimiter', () => {
  it('limits a key once it has recorded the allowed attempts inside the window', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.isLimited('a', 0)).toBe(false);
    limiter.record('a', 0);
    limiter.record('a', 100);
    expect(limiter.isLimited('a', 200)).toBe(true);
  });

  it('does not count a check that was never recorded', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.isLimited('a', 0)).toBe(false);
    expect(limiter.isLimited('a', 1)).toBe(false);
  });

  it('lets the key act again once old attempts leave the window', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.record('a', 0);
    expect(limiter.isLimited('a', 999)).toBe(true);
    expect(limiter.isLimited('a', 1000)).toBe(false);
  });

  it('counts each visitor separately', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.record('a', 0);
    expect(limiter.isLimited('b', 0)).toBe(false);
  });
});

describe('clientIp', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://getsahtain.com/ar/contact', { headers });

  it('prefers the CDN header, then the first forwarded address', () => {
    expect(clientIp(req({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' }))).toBe('1.2.3.4');
    expect(clientIp(req({ 'x-forwarded-for': '5.6.7.8, 9.9.9.9' }))).toBe('5.6.7.8');
  });

  it('returns undefined when no address is forwarded, never a shared key', () => {
    expect(clientIp(req({}))).toBeUndefined();
  });
});
