/** RTK Query mutation trigger result (`{ data }` or `{ error }`). */
export function isMutationError(result: unknown): result is { error: unknown } {
  return typeof result === 'object' && result !== null && 'error' in result;
}
