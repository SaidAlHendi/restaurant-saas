export type OrderListCursor = {
  createdAt: string;
  id: string;
};

export function encodeOrderListCursor(cursor: OrderListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeOrderListCursor(raw: string): OrderListCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid cursor');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('createdAt' in parsed) ||
    !('id' in parsed) ||
    typeof (parsed as OrderListCursor).createdAt !== 'string' ||
    typeof (parsed as OrderListCursor).id !== 'string'
  ) {
    throw new Error('Invalid cursor');
  }
  return parsed as OrderListCursor;
}
