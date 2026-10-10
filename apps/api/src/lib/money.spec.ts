import { computeOrderTotals } from './money';

describe('computeOrderTotals', () => {
  const lines = [{ lineTotalMinor: 10_000, status: 'pending' as const }];

  it('computes 15% exclusive tax with half-up rounding', () => {
    const totals = computeOrderTotals({
      lines: [{ lineTotalMinor: 1000, status: 'pending' }],
      discountMinor: 0,
      taxRateBp: 1500,
      taxInclusive: false,
    });
    expect(totals.subtotalMinor).toBe(1000);
    expect(totals.taxMinor).toBe(150);
    expect(totals.totalMinor).toBe(1150);
  });

  it('rounds half-up at .5 for exclusive tax', () => {
    const totals = computeOrderTotals({
      lines: [{ lineTotalMinor: 1003, status: 'pending' }],
      discountMinor: 0,
      taxRateBp: 1500,
      taxInclusive: false,
    });
    expect(totals.taxMinor).toBe(150);
  });

  it('computes 15% inclusive tax', () => {
    const totals = computeOrderTotals({
      lines,
      discountMinor: 0,
      taxRateBp: 1500,
      taxInclusive: true,
    });
    expect(totals.totalMinor).toBe(10_000);
    expect(totals.taxMinor).toBe(1304);
  });

  it('handles zero tax rate exclusive', () => {
    const totals = computeOrderTotals({
      lines,
      discountMinor: 0,
      taxRateBp: 0,
      taxInclusive: false,
    });
    expect(totals.taxMinor).toBe(0);
    expect(totals.totalMinor).toBe(10_000);
  });

  it('ignores voided lines in subtotal', () => {
    const totals = computeOrderTotals({
      lines: [
        { lineTotalMinor: 5000, status: 'voided' },
        { lineTotalMinor: 3000, status: 'pending' },
      ],
      discountMinor: 0,
      taxRateBp: 0,
      taxInclusive: false,
    });
    expect(totals.subtotalMinor).toBe(3000);
  });

  it('handles large amounts', () => {
    const totals = computeOrderTotals({
      lines: [{ lineTotalMinor: 999_999_999, status: 'pending' }],
      discountMinor: 0,
      taxRateBp: 1500,
      taxInclusive: false,
    });
    expect(totals.taxMinor).toBe(150_000_000);
    expect(totals.totalMinor).toBe(1_149_999_999);
  });
});
