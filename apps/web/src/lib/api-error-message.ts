import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export type ParsedApiError = {
  status: number | null;
  code: string | null;
  message: string | null;
};

export function parseApiError(error: unknown): ParsedApiError {
  if (!error || typeof error !== 'object') {
    return { status: null, code: null, message: null };
  }
  const fetchError = error as FetchBaseQueryError;
  if (!('status' in fetchError)) {
    return { status: null, code: null, message: null };
  }
  const status = typeof fetchError.status === 'number' ? fetchError.status : null;
  const data = fetchError.data;
  if (!data || typeof data !== 'object') {
    return { status, code: null, message: null };
  }
  const nested = data as { error?: { code?: unknown; message?: unknown } };
  const code = typeof nested.error?.code === 'string' ? nested.error.code : null;
  const message = typeof nested.error?.message === 'string' ? nested.error.message : null;
  return { status, code, message };
}
