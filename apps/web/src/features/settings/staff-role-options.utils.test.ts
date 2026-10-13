import { describe, expect, it } from 'vitest';

import {
  assignableRoleKeys,
  invitableRoleKeys,
  pinOnlyInvitableRoleKeys,
} from './staff-role-options.utils.js';

describe('assignableRoleKeys', () => {
  it('owner sees all four roles for edit', () => {
    expect(assignableRoleKeys('owner')).toEqual(['owner', 'manager', 'cashier', 'kitchen']);
  });

  it('manager sees cashier and kitchen only', () => {
    expect(assignableRoleKeys('manager')).toEqual(['cashier', 'kitchen']);
  });

  it('null actor sees none', () => {
    expect(assignableRoleKeys(null)).toEqual([]);
  });
});

describe('invitableRoleKeys', () => {
  it('owner can invite all roles', () => {
    expect(invitableRoleKeys('owner')).toEqual(['owner', 'manager', 'cashier', 'kitchen']);
  });

  it('manager can invite cashier and kitchen only', () => {
    expect(invitableRoleKeys('manager')).toEqual(['cashier', 'kitchen']);
  });
});

describe('pinOnlyInvitableRoleKeys', () => {
  it('owner gets manager cashier kitchen', () => {
    expect(pinOnlyInvitableRoleKeys('owner')).toEqual(['manager', 'cashier', 'kitchen']);
  });

  it('manager gets cashier and kitchen', () => {
    expect(pinOnlyInvitableRoleKeys('manager')).toEqual(['cashier', 'kitchen']);
  });
});
