export function barWidthPercent(value: number, total: number): number {
  if (total <= 0 || value <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((value / total) * 100));
}
