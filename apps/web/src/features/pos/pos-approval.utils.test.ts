import { describe, expect, it } from 'vitest';

import {
  buildOrderApprovalBody,
  cancelOrderNeedsApproval,
  orderActionDialogStepAfterReason,
  voidItemNeedsApproval,
} from './pos-approval.utils.js';

describe('pos approval utils', () => {
  it('cancel on placed needs approval without orders.cancel', () => {
    expect(cancelOrderNeedsApproval('placed', false)).toBe(true);
    expect(cancelOrderNeedsApproval('placed', true)).toBe(false);
    expect(cancelOrderNeedsApproval('draft', false)).toBe(false);
  });

  it('void on preparing needs approval without orders.cancel', () => {
    expect(voidItemNeedsApproval('preparing', false, true)).toBe(true);
    expect(voidItemNeedsApproval('placed', false, true)).toBe(false);
  });

  it('steps from reason to approval when required', () => {
    expect(orderActionDialogStepAfterReason(true)).toBe('approval');
    expect(orderActionDialogStepAfterReason(false)).toBe('submit');
  });

  it('builds approval request body', () => {
    const membershipId = '01932a1a-7b3e-7000-8000-000000000040';
    expect(buildOrderApprovalBody(membershipId, '1234')).toEqual({
      membershipId,
      pin: '1234',
    });
  });
});
