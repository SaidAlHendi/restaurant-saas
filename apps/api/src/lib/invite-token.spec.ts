import { generateInviteToken, hashInviteToken, inviteExpiresAt, INVITE_TTL_MS } from './invite-token';

describe('invite token', () => {
  it('hashes consistently', () => {
    const { raw, hash } = generateInviteToken();
    expect(raw.length).toBeGreaterThan(20);
    expect(hashInviteToken(raw)).toBe(hash);
  });

  it('generates unique tokens', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  it('expiry is seven days from clock', () => {
    const from = new Date('2026-01-01T12:00:00.000Z');
    const exp = inviteExpiresAt(from);
    expect(exp.getTime() - from.getTime()).toBe(INVITE_TTL_MS);
  });
});
