import type { LeadCreateBody } from '@app/shared';

import { getSiteEnv } from './env.server.js';

export type SubmitLeadResult = { ok: true } | { ok: false; kind: 'rate_limited' | 'unavailable' };

const REQUEST_TIMEOUT_MS = 8000;

/** Send a validated lead to the API (server to server). Never throws: failures become a result kind. */
export async function submitLead(
  body: LeadCreateBody,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitLeadResult> {
  try {
    const response = await fetchImpl(new URL('/v1/public/leads', getSiteEnv().PUBLIC_API_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      return { ok: true };
    }
    return { ok: false, kind: response.status === 429 ? 'rate_limited' : 'unavailable' };
  } catch {
    return { ok: false, kind: 'unavailable' };
  }
}
