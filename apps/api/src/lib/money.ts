export type OrderLineForTotals = {
  lineTotalMinor: number;
  status: 'pending' | 'preparing' | 'ready' | 'voided';
};

export type OrderTotalsInput = {
  lines: OrderLineForTotals[];
  discountMinor: number;
  taxRateBp: number;
  taxInclusive: boolean;
};

export type OrderTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};

function roundHalfUp(value: number): number {
  if (value >= 0) {
    return Math.floor(value + 0.5);
  }
  return Math.ceil(value - 0.5);
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const discountMinor = Math.max(0, input.discountMinor);
  const subtotalMinor = input.lines
    .filter((line) => line.status !== 'voided')
    .reduce((sum, line) => sum + line.lineTotalMinor, 0);

  const taxableBase = Math.max(0, subtotalMinor - discountMinor);

  if (input.taxInclusive) {
    if (input.taxRateBp === 0) {
      return {
        subtotalMinor,
        discountMinor,
        taxMinor: 0,
        totalMinor: taxableBase,
      };
    }
    const taxMinor = roundHalfUp(
      (taxableBase * input.taxRateBp) / (10_000 + input.taxRateBp),
    );
    return {
      subtotalMinor,
      discountMinor,
      taxMinor,
      totalMinor: taxableBase,
    };
  }

  const taxMinor = roundHalfUp((taxableBase * input.taxRateBp) / 10_000);
  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: taxableBase + taxMinor,
  };
}

export function computeLineTotalMinor(unitPriceMinor: number, quantity: number): number {
  return unitPriceMinor * quantity;
}
