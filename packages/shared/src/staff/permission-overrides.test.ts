import { describe, expect, it } from 'vitest';

import {
  computeEffectivePermissions,
  putStaffPermissionOverridesBodySchema,
} from './permission-overrides.js';

describe('computeEffectivePermissions', () => {
  it('adds grants and removes denies', () => {
    expect(
      computeEffectivePermissions(['menu.manage', 'staff.read'], ['tables.rotate_qr'], ['menu.manage']).sort(),
    ).toEqual(['staff.read', 'tables.rotate_qr']);
  });

  it('does not duplicate a granted key the role already has', () => {
    expect(computeEffectivePermissions(['staff.read'], ['staff.read'], [])).toEqual(['staff.read']);
  });
});

describe('putStaffPermissionOverridesBodySchema', () => {
  it('rejects a key that is both granted and denied', () => {
    const r = putStaffPermissionOverridesBodySchema.safeParse({
      grant: ['tables.rotate_qr'],
      deny: ['tables.rotate_qr'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects owner-only keys and unknown keys', () => {
    expect(
      putStaffPermissionOverridesBodySchema.safeParse({ grant: ['billing.manage'], deny: [] }).success,
    ).toBe(false);
    expect(putStaffPermissionOverridesBodySchema.safeParse({ grant: ['nope'], deny: [] }).success).toBe(false);
  });
});
