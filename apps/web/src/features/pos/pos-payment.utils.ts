/** Suggested cash tender amounts (minor units), including exact due and common round-ups. */
export function quickTenderAmounts(dueMinor: number): number[] {
  if (dueMinor <= 0) {
    return [];
  }
  const candidates = new Set<number>([dueMinor]);
  const steps = [100, 500, 1000, 5000, 10000, 20000, 50000, 100000];
  for (const step of steps) {
    const rounded = Math.ceil(dueMinor / step) * step;
    if (rounded >= dueMinor) {
      candidates.add(rounded);
    }
  }
  return [...candidates].sort((a, b) => a - b).slice(0, 4);
}

export function cashChangeMinor(tenderedMinor: number, dueMinor: number): number {
  return Math.max(0, tenderedMinor - dueMinor);
}
