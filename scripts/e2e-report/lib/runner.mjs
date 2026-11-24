import assert from 'node:assert/strict';

/**
 * Tiny test registry.
 *   t('Cashier', 'Orders', 'creates a takeaway order', async (ctx) => { ... })
 * A test passes when its function returns/resolves, fails when it throws, and is skipped when it
 * throws `skip('why')`. Tests run in registration order, so later tests may rely on state that
 * earlier tests stored on the shared `ctx` object.
 */
const registry = [];
export const results = [];

class SkipSignal extends Error {}
export const skip = (reason) => { throw new SkipSignal(reason); };

export function t(role, feature, name, fn) {
  registry.push({ role, feature, name, fn });
}

/** Status assertion that prints the response body on failure so the report is actionable. */
export function expectStatus(res, expected, label = '') {
  const list = Array.isArray(expected) ? expected : [expected];
  if (!list.includes(res.status)) {
    const detail = (res.text ?? '').slice(0, 300);
    throw new assert.AssertionError({
      message: `${label ? label + ': ' : ''}expected HTTP ${list.join(' or ')}, got ${res.status}${detail ? ` - ${detail}` : ''}`,
    });
  }
  return res;
}

export { assert };

export async function runAll(ctx, { onResult } = {}) {
  for (const test of registry) {
    const started = performance.now();
    let status = 'pass';
    let message = '';
    try {
      await test.fn(ctx);
    } catch (err) {
      if (err instanceof SkipSignal) {
        status = 'skip';
        message = err.message;
      } else {
        status = 'fail';
        message = err?.message ?? String(err);
      }
    }
    const r = { ...test, fn: undefined, status, message, ms: Math.round(performance.now() - started) };
    results.push(r);
    onResult?.(r);
  }
  return results;
}
