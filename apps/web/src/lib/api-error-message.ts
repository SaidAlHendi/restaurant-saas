import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export type ParsedApiError = {
  status: number | null;
  code: string | null;
  message: string | null;
  details: Record<string, unknown> | null;
};

export function parseApiError(error: unknown): ParsedApiError {
  if (!error || typeof error !== 'object') {
    return { status: null, code: null, message: null, details: null };
  }
  const fetchError = error as FetchBaseQueryError;
  if (!('status' in fetchError)) {
    return { status: null, code: null, message: null, details: null };
  }
  const status = typeof fetchError.status === 'number' ? fetchError.status : null;
  const data = fetchError.data;
  if (!data || typeof data !== 'object') {
    return { status, code: null, message: null, details: null };
  }
  const nested = data as { error?: { code?: unknown; message?: unknown; details?: unknown } };
  const code = typeof nested.error?.code === 'string' ? nested.error.code : null;
  const message = typeof nested.error?.message === 'string' ? nested.error.message : null;
  const rawDetails = nested.error?.details;
  const details =
    rawDetails !== null && typeof rawDetails === 'object' && !Array.isArray(rawDetails)
      ? (rawDetails as Record<string, unknown>)
      : null;
  return { status, code, message, details };
}
