export function isPgUniqueViolation(err: unknown, constraint?: string): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5; depth += 1) {
    if (current && typeof current === 'object' && 'code' in current) {
      const row = current as { code: string; constraint?: string };
      if (row.code === '23505') {
        if (!constraint || row.constraint === constraint) {
          return true;
        }
      }
    }
    if (current && typeof current === 'object' && 'cause' in current) {
      current = Reflect.get(current, 'cause');
      continue;
    }
    break;
  }
  return false;
}
