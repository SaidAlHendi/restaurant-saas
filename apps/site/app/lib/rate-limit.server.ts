export type RateLimiter = {
  /** True if the key may act now; records the attempt. */
  allow: (key: string, now?: number) => boolean;
};

const MAX_TRACKED_KEYS = 5000;

/**
 * Small in-memory sliding-window limiter, per process. It is a first line of defence for the contact
 * form; a CDN rate rule is the shared backstop when several instances run.
 */
export function createRateLimiter(options: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < options.windowMs);
      if (recent.length >= options.limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > MAX_TRACKED_KEYS) {
        for (const [k, times] of hits) {
          if (times.every((time) => now - time >= options.windowMs)) {
            hits.delete(k);
          }
        }
      }
      return true;
    },
  };
}

/** The visitor's address as forwarded by the CDN or proxy; `unknown` when nothing is forwarded. */
export function clientIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) {
    return cf.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded && forwarded !== '' ? forwarded : 'unknown';
}
