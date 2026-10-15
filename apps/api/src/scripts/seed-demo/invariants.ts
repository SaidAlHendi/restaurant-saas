import { computeOrderTotals, computePaymentStatus } from '@app/shared';

import type { OrgSeedDefinition } from './data/types';
import type { SeededOrg } from './seed-orgs';

export type InvariantFailure = { code: string; message: string };

export function invariantOrgBranchCount(seeded: SeededOrg): InvariantFailure | null {
  const expected = seeded.definition.branches.length;
  if (seeded.branches.length !== expected) {
    return {
      code: 'BRANCH_COUNT',
      message: `${seeded.definition.slug}: expected ${String(expected)} branches, got ${String(seeded.branches.length)}`,
    };
  }
  return null;
}

export function invariantProductCount(
  definition: OrgSeedDefinition,
  actual: number,
): InvariantFailure | null {
  const expected = definition.products.filter((p) => p.isActive !== false).length;
  if (actual < expected) {
    return {
      code: 'PRODUCT_COUNT',
      message: `${definition.slug}: expected at least ${String(expected)} active products, got ${String(actual)}`,
    };
  }
  return null;
}

export function invariantModifierLinkRatio(
  definition: OrgSeedDefinition,
  linkCount: number,
  productCount: number,
): InvariantFailure | null {
  if (productCount === 0) {
    return { code: 'NO_PRODUCTS', message: `${definition.slug}: no products` };
  }
  const ratio = linkCount / productCount;
  if (ratio < 0.05 || ratio > 2.5) {
    return {
      code: 'MODIFIER_LINK_RATIO',
      message: `${definition.slug}: product_modifier_groups ratio ${String(ratio)} outside 0.05–2.5`,
    };
  }
  return null;
}

export function invariantTablesPerBranch(
  slug: string,
  branchKey: string,
  tableCount: number,
): InvariantFailure | null {
  if (tableCount < 8) {
    return {
      code: 'TABLE_COUNT',
      message: `${slug}/${branchKey}: expected at least 8 tables, got ${String(tableCount)}`,
    };
  }
  return null;
}

export function invariantCompletedOrdersPaid(
  unpaidCompletedCount: number,
): InvariantFailure | null {
  if (unpaidCompletedCount > 0) {
    return {
      code: 'COMPLETED_NOT_PAID',
      message: `${String(unpaidCompletedCount)} completed order(s) are not fully paid`,
    };
  }
  return null;
}

export function invariantCancelledWithoutPayments(
  cancelledWithPayments: number,
): InvariantFailure | null {
  if (cancelledWithPayments > 0) {
    return {
      code: 'CANCELLED_HAS_PAYMENTS',
      message: `${String(cancelledWithPayments)} cancelled order(s) have captured payments`,
    };
  }
  return null;
}

export function invariantBranchCounters(
  branchId: string,
  businessDate: string,
  counter: number,
  maxOrderNumber: number,
): InvariantFailure | null {
  if (counter < maxOrderNumber) {
    return {
      code: 'BRANCH_COUNTER',
      message: `branch ${branchId} ${businessDate}: counter ${String(counter)} < max order ${String(maxOrderNumber)}`,
    };
  }
  return null;
}

export function invariantOrdersMissingPlacedEvent(missing: number): InvariantFailure | null {
  if (missing > 0) {
    return {
      code: 'ORDER_PLACED_EVENT',
      message: `${String(missing)} order(s) missing a placed event`,
    };
  }
  return null;
}

export type OrderTotalsRow = {
  id: string;
  itemsSubtotalMinor: number;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  taxRateBp: number;
  taxInclusive: boolean;
};

/** Orders whose stored money does not match computeOrderTotals over their non-voided items. */
export function findOrderTotalsMismatches(rows: OrderTotalsRow[]): string[] {
  return rows
    .filter((row) => {
      const expected = computeOrderTotals({
        lines: [{ lineTotalMinor: row.itemsSubtotalMinor, status: 'ready' }],
        discountMinor: row.discountMinor,
        taxRateBp: row.taxRateBp,
        taxInclusive: row.taxInclusive,
      });
      return (
        expected.subtotalMinor !== row.subtotalMinor ||
        expected.taxMinor !== row.taxMinor ||
        expected.totalMinor !== row.totalMinor
      );
    })
    .map((row) => row.id);
}

export type OrderPaymentRow = {
  id: string;
  totalMinor: number;
  paidMinor: number;
  paymentStatus: string;
};

/** Orders whose payment_status is not computePaymentStatus(total, captured payments). */
export function findPaymentStatusMismatches(rows: OrderPaymentRow[]): string[] {
  return rows
    .filter((row) => computePaymentStatus(row.totalMinor, row.paidMinor) !== row.paymentStatus)
    .map((row) => row.id);
}

/** Fails with up to five example ids when any row breaks the rule described by `what`. */
export function invariantNoOffenders(
  code: string,
  what: string,
  offenderIds: string[],
): InvariantFailure | null {
  if (offenderIds.length === 0) {
    return null;
  }
  const examples = offenderIds.slice(0, 5).join(', ');
  return {
    code,
    message: `${String(offenderIds.length)} ${what} (e.g. ${examples})`,
  };
}

export function collectInvariantFailures(
  failures: Array<InvariantFailure | null>,
): InvariantFailure[] {
  return failures.filter((f): f is InvariantFailure => f !== null);
}
