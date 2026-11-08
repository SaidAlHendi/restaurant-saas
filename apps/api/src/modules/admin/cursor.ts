import { ValidationError } from '../../core/errors/app-errors';

/** Opaque keyset cursor: a timestamp and an id, base64url-encoded. */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = new Date(iso ?? '');
  if (!iso || !id || Number.isNaN(createdAt.getTime())) {
    throw new ValidationError('Invalid cursor');
  }
  return { createdAt, id };
}

/** Escapes LIKE wildcards so a search for "50%" does not match everything. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
