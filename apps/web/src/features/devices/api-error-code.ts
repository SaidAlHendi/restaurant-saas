/** The `error.code` string of an API error response, or null. */
export function apiErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return null;
  }
  const data = (error as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return null;
  }
  const inner = (data as { error?: unknown }).error;
  if (typeof inner !== 'object' || inner === null || !('code' in inner)) {
    return null;
  }
  const code = (inner as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}
