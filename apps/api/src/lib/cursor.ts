export type ProductListCursor = {
  sortOrder: number;
  id: string;
};

export function encodeProductListCursor(cursor: ProductListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeProductListCursor(raw: string): ProductListCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid cursor');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('sortOrder' in parsed) ||
    !('id' in parsed) ||
    typeof (parsed as ProductListCursor).sortOrder !== 'number' ||
    typeof (parsed as ProductListCursor).id !== 'string'
  ) {
    throw new Error('Invalid cursor');
  }
  return parsed as ProductListCursor;
}
