import { baitShamiOrg } from './data/bait-shami';
import {
  collectInvariantFailures,
  invariantBranchCounters,
  invariantCancelledWithoutPayments,
  invariantCompletedOrdersPaid,
  invariantModifierLinkRatio,
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
});
