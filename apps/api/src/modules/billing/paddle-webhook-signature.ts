import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaddleSignatureParts = {
  ts: number;
  h1Values: string[];
};

export function parsePaddleSignatureHeader(header: string): PaddleSignatureParts | null {
  const parts = header.split(';').map((p) => p.trim()).filter((p) => p.length > 0);
  let ts: number | null = null;
  const h1Values: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === 'ts') {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        return null;
      }
      ts = n;
    } else if (key === 'h1' && value.length > 0) {
      h1Values.push(value);
    }
  }
  if (ts === null || h1Values.length === 0) {
    return null;
  }
  return { ts, h1Values };
}

export function computePaddleSignatureH1(secret: string, ts: number, rawBody: Buffer): string {
  const payload = `${String(ts)}:${rawBody.toString('utf8')}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length || ba.length === 0) {
      return false;
    }
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Verifies Paddle-Signature. Rejects when secret is empty/missing, header invalid,
 * timestamp skew > maxSkewMs, or no h1 matches.
 */
export function verifyPaddleWebhookSignature(opts: {
  secret: string | undefined;
  header: string | undefined;
  rawBody: Buffer;
  nowMs: number;
  maxSkewMs?: number;
}): boolean {
  const secret = opts.secret;
  if (secret === undefined || secret.length === 0) {
    return false;
  }
  if (opts.header === undefined || opts.header.length === 0) {
    return false;
  }
  const parsed = parsePaddleSignatureHeader(opts.header);
  if (parsed === null) {
    return false;
  }
  const maxSkewMs = opts.maxSkewMs ?? 5 * 60 * 1000;
  const eventMs = parsed.ts * 1000;
  if (opts.nowMs - eventMs > maxSkewMs) {
    return false;
  }
  const expected = computePaddleSignatureH1(secret, parsed.ts, opts.rawBody);
  return parsed.h1Values.some((h1) => safeEqualHex(h1, expected));
}
