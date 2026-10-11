import { createDemoRng, deterministicUuid, deterministicQrToken, mulberry32 } from './random';

describe('seed-demo random', () => {
  it('mulberry32 is stable for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('createDemoRng depends on anchor and scope', () => {
    const r1 = createDemoRng('2026-01-01T00:00:00.000Z', 'scope-a');
    const r2 = createDemoRng('2026-01-01T00:00:00.000Z', 'scope-b');
    expect(r1()).not.toEqual(r2());
  });

  it('deterministicUuid is stable', () => {
    expect(deterministicUuid('org', 'seed-bait-shami')).toBe(
      deterministicUuid('org', 'seed-bait-shami'),
    );
    expect(deterministicUuid('org', 'seed-bait-shami')).not.toEqual(
      deterministicUuid('org', 'seed-burger-lab'),
    );
  });

  it('deterministicQrToken is stable', () => {
    expect(deterministicQrToken('branch', 'T-1')).toEqual(deterministicQrToken('branch', 'T-1'));
  });
});
