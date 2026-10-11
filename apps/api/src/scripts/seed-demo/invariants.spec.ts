import { baitShamiOrg } from './data/bait-shami';
import {
  collectInvariantFailures,
  findOrderTotalsMismatches,
  findPaymentStatusMismatches,
  invariantBranchCounters,
  invariantCancelledWithoutPayments,
  invariantCompletedOrdersPaid,
  invariantModifierLinkRatio,
  invariantNoOffenders,
  invariantOrdersMissingPlacedEvent,
  invariantOrgBranchCount,
  invariantProductCount,
  invariantTablesPerBranch,
} from './invariants';
import type { SeededOrg } from './seed-orgs';

describe('seed-demo invariants', () => {
  const seeded: SeededOrg = {
    definition: baitShamiOrg,
    id: '00000000-0000-4000-8000-000000000099',
    branches: baitShamiOrg.branches.map((b) => ({
      key: b.key,
      id: `branch-${b.key}`,
      slug: b.slug,
    })),
  };

  it('passes branch count when branches match definition', () => {
    expect(invariantOrgBranchCount(seeded)).toBeNull();
  });

  it('fails when product count is too low', () => {
    expect(invariantProductCount(baitShamiOrg, 0)?.code).toBe('PRODUCT_COUNT');
  });

  it('fails when table count is below minimum', () => {
    expect(invariantTablesPerBranch('seed-bait-shami', 'riyadh', 3)?.code).toBe('TABLE_COUNT');
  });

  it('validates modifier link ratio band', () => {
    expect(invariantModifierLinkRatio(baitShamiOrg, 4, 100)?.code).toBe('MODIFIER_LINK_RATIO');
    expect(invariantModifierLinkRatio(baitShamiOrg, 80, 100)).toBeNull();
  });

  it('collectInvariantFailures drops nulls', () => {
    expect(collectInvariantFailures([null, { code: 'X', message: 'y' }])).toHaveLength(1);
  });

  it('requires completed orders to be paid', () => {
    expect(invariantCompletedOrdersPaid(0)).toBeNull();
    expect(invariantCompletedOrdersPaid(2)?.code).toBe('COMPLETED_NOT_PAID');
  });

  it('forbids payments on cancelled orders', () => {
    expect(invariantCancelledWithoutPayments(0)).toBeNull();
    expect(invariantCancelledWithoutPayments(1)?.code).toBe('CANCELLED_HAS_PAYMENTS');
  });

  it('checks branch counter vs max order number', () => {
    expect(invariantBranchCounters('b', '2026-01-01', 10, 8)).toBeNull();
    expect(invariantBranchCounters('b', '2026-01-01', 3, 8)?.code).toBe('BRANCH_COUNTER');
  });

  it('requires placed events', () => {
    expect(invariantOrdersMissingPlacedEvent(0)).toBeNull();
    expect(invariantOrdersMissingPlacedEvent(1)?.code).toBe('ORDER_PLACED_EVENT');
  });
  describe('order money', () => {
    const base = {
      id: 'o1',
      itemsSubtotalMinor: 10_000,
      subtotalMinor: 10_000,
      discountMinor: 0,
      taxMinor: 1_500,
      totalMinor: 11_500,
      taxRateBp: 1_500,
      taxInclusive: false,
    };

    it('accepts totals that match computeOrderTotals (exclusive and inclusive tax)', () => {
      expect(findOrderTotalsMismatches([base])).toEqual([]);
      expect(
        findOrderTotalsMismatches([
          { ...base, id: 'o2', taxMinor: 1_304, totalMinor: 10_000, taxInclusive: true },
        ]),
      ).toEqual([]);
    });

    it('flags an order whose subtotal or total drifted from its items', () => {
      expect(findOrderTotalsMismatches([{ ...base, itemsSubtotalMinor: 9_000 }])).toEqual(['o1']);
      expect(findOrderTotalsMismatches([{ ...base, totalMinor: 11_000 }])).toEqual(['o1']);
    });

    it('flags a payment_status that does not match the captured amount', () => {
      const rows = [
        { id: 'paid', totalMinor: 1_000, paidMinor: 1_000, paymentStatus: 'paid' },
        { id: 'partial', totalMinor: 1_000, paidMinor: 400, paymentStatus: 'partial' },
        { id: 'wrong', totalMinor: 1_000, paidMinor: 400, paymentStatus: 'paid' },
      ];
      expect(findPaymentStatusMismatches(rows)).toEqual(['wrong']);
    });

    it('reports offenders with a count and examples', () => {
      expect(invariantNoOffenders('X', 'bad row(s)', [])).toBeNull();
      expect(invariantNoOffenders('X', 'bad row(s)', ['a', 'b'])).toEqual({
        code: 'X',
        message: '2 bad row(s) (e.g. a, b)',
      });
    });
  });
});
