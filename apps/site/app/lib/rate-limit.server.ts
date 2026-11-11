export type RateLimiter = {
  /** True if the key has used up its attempts inside the window. Records nothing. */
  isLimited: (key: string, now?: number) => boolean;
  /** Count one attempt for the key. */
  record: (key: string, now?: number) => void;
};

const MAX_TRACKED_KEYS = 5000;

/**
 * Small in-memory sliding-window limiter, per process. It is a first line of defence for the contact
 * form; a CDN rate rule is the shared backstop when several instances run.
 */
export function createRateLimiter(options: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  const recent = (key: string, now: number): number[] =>
    (hits.get(key) ?? []).filter((time) => now - time < options.windowMs);

  return {
    isLimited(key, now = Date.now()) {
      return recent(key, now).length >= options.limit;
    },
    record(key, now = Date.now()) {
      hits.set(key, [...recent(key, now), now]);
      if (hits.size > MAX_TRACKED_KEYS) {
        for (const [k, times] of hits) {
          if (times.every((time) => now - time >= options.windowMs)) {
            hits.delete(k);
          }
        }
      }
    },
  };
}

/**
 * The visitor's address as forwarded by the CDN, or undefined when none is forwarded. These headers
 * are only trustworthy when the site server accepts traffic from the CDN alone (see the launch
 * checklist); callers must not invent a shared key for visitors without one.
 */
export function clientIp(request: Request): string | undefined {
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf) {
    return cf;
  }
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded ? forwarded : undefined;
}
