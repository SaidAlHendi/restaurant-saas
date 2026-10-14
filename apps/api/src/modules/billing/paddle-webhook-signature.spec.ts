import { computePaddleSignatureH1, verifyPaddleWebhookSignature } from './paddle-webhook-signature';

describe('verifyPaddleWebhookSignature', () => {
  const secret = 'test-webhook-secret';
  const rawBody = Buffer.from('{"event_id":"evt_1"}', 'utf8');
  const ts = 1_700_000_000;
  const nowMs = ts * 1000 + 60_000;

  function header(h1: string, timestamp = ts): string {
    return `ts=${String(timestamp)};h1=${h1}`;
  }

  it('accepts a valid signature', () => {
    const h1 = computePaddleSignatureH1(secret, ts, rawBody);
    expect(
      verifyPaddleWebhookSignature({
        secret,
        header: header(h1),
        rawBody,
        nowMs,
      }),
    ).toBe(true);
  });

  it('accepts when any of multiple h1 values matches', () => {
    const good = computePaddleSignatureH1(secret, ts, rawBody);
    expect(
      verifyPaddleWebhookSignature({
        secret,
        header: `ts=${String(ts)};h1=deadbeef;h1=${good}`,
        rawBody,
        nowMs,
      }),
    ).toBe(true);
  });

  it('rejects a bad signature', () => {
    expect(
      verifyPaddleWebhookSignature({
        secret,
        header: header('00'.repeat(32)),
        rawBody,
        nowMs,
      }),
    ).toBe(false);
  });

  it('rejects a tampered body', () => {
    const h1 = computePaddleSignatureH1(secret, ts, rawBody);
    expect(
      verifyPaddleWebhookSignature({
        secret,
        header: header(h1),
        rawBody: Buffer.from('{"event_id":"evt_2"}', 'utf8'),
        nowMs,
      }),
    ).toBe(false);
  });

  it('rejects timestamps older than 5 minutes', () => {
    const h1 = computePaddleSignatureH1(secret, ts, rawBody);
    expect(
      verifyPaddleWebhookSignature({
        secret,
        header: header(h1),
        rawBody,
        nowMs: ts * 1000 + 6 * 60 * 1000,
      }),
    ).toBe(false);
  });

  it('rejects missing secret or empty secret', () => {
    const h1 = computePaddleSignatureH1(secret, ts, rawBody);
    expect(
      verifyPaddleWebhookSignature({
        secret: undefined,
        header: header(h1),
        rawBody,
        nowMs,
      }),
    ).toBe(false);
    expect(
      verifyPaddleWebhookSignature({
        secret: '',
        header: header(h1),
        rawBody,
        nowMs,
      }),
    ).toBe(false);
  });

  it('rejects missing header', () => {
    expect(
      verifyPaddleWebhookSignature({
        secret,
        header: undefined,
        rawBody,
        nowMs,
      }),
    ).toBe(false);
  });
});
