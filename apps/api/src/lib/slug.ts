export function slugifyBase(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function slugWithSuffix(base: string, suffix: number): string {
  return suffix === 0 ? base : `${base}-${String(suffix)}`;
}
