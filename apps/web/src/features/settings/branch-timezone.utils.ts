export const BRANCH_TIMEZONE_OPTIONS = [
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Qatar',
  'Asia/Bahrain',
  'Asia/Muscat',
  'Africa/Cairo',
  'Europe/London',
  'UTC',
] as const;

export function filterTimezoneOptions(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return [...BRANCH_TIMEZONE_OPTIONS];
  }
  return BRANCH_TIMEZONE_OPTIONS.filter((zone) => zone.toLowerCase().includes(q));
}
