/** Escapes LIKE wildcards so a search for "50%" does not match everything. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
