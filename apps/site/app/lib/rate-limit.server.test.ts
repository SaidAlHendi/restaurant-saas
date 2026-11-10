import { describe, expect, it } from 'vitest';

import { clientIp, createRateLimiter } from './rate-limit.server.js';

describe('createRateLimiter', () => {
  it('allows up to the limit inside the window, then blocks', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 100)).toBe(true);
    expect(limiter.allow('a', 200)).toBe(false);
  });

  it('lets the key act again once old attempts leave the window', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 999)).toBe(false);
    expect(limiter.allow('a', 1000)).toBe(true);
  });

  it('counts each visitor separately', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('b', 0)).toBe(true);
  });
});

describe('clientIp', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://getsahtain.com/ar/contact', { headers });

  it('prefers the CDN header, then the first forwarded address', () => {
    expect(clientIp(req({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' }))).toBe('1.2.3.4');
    expect(clientIp(req({ 'x-forwarded-for': '5.6.7.8, 9.9.9.9' }))).toBe('5.6.7.8');
  });

  it('falls back to unknown', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});
