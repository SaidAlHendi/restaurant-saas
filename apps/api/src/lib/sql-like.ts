/** Escape `%` and `_` for use in SQL LIKE/ILIKE with ESCAPE '\\'. */
export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
