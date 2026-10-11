import { createHash } from 'node:crypto';

import { DEMO_SEED_NAMESPACE } from './constants';

/** Mulberry32 PRNG — same seed string yields the same sequence. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeedString(input: string): number {
  const digest = createHash('sha256').update(input).digest();
  return digest.readUInt32BE(0);
}

export function createDemoRng(anchorIso: string, scope: string): () => number {
  const seed = hashSeedString(`${DEMO_SEED_NAMESPACE}\0${anchorIso}\0${scope}`);
  return mulberry32(seed);
}

/** Deterministic UUID (RFC 4122 variant) from stable parts. */
export function deterministicUuid(...parts: string[]): string {
  const hash = createHash('sha256').update(parts.join('\0')).digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));
  const byte6 = bytes[6];
  const byte8 = bytes[8];
  if (byte6 === undefined || byte8 === undefined) {
    throw new Error('deterministicUuid: hash too short');
  }
  bytes[6] = (byte6 & 0x0f) | 0x40;
  bytes[8] = (byte8 & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function deterministicQrToken(scope: string, label: string): string {
  return createHash('sha256')
    .update(`${DEMO_SEED_NAMESPACE}:qr:${scope}:${label}`)
    .digest('base64url');
}
