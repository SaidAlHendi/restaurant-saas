import { describe, expect, it } from 'vitest';

import {
  hasPermissionOverride,
  isPermissionEnabled,
  setPermissionEnabled,
} from './staff-permissions-form.utils.js';

const role = ['menu.manage', 'staff.read'];
const none = { grant: [], deny: [] };

describe('setPermissionEnabled', () => {
  it('grants a permission the role lacks', () => {
    const next = setPermissionEnabled(role, none, 'tables.rotate_qr', true);
    expect(next).toEqual({ grant: ['tables.rotate_qr'], deny: [] });
    expect(isPermissionEnabled(role, next, 'tables.rotate_qr')).toBe(true);
  });

  it('denies a permission the role has', () => {
    const next = setPermissionEnabled(role, none, 'menu.manage', false);
    expect(next).toEqual({ grant: [], deny: ['menu.manage'] });
    expect(isPermissionEnabled(role, next, 'menu.manage')).toBe(false);
  });

  it('drops the override when the value returns to the role default', () => {
    const granted = setPermissionEnabled(role, none, 'tables.rotate_qr', true);
    expect(setPermissionEnabled(role, granted, 'tables.rotate_qr', false)).toEqual(none);
    const denied = setPermissionEnabled(role, none, 'menu.manage', false);
    expect(setPermissionEnabled(role, denied, 'menu.manage', true)).toEqual(none);
  });

  it('does not mutate the draft it was given', () => {
    const draft = { grant: ['a'], deny: [] };
    setPermissionEnabled(role, draft, 'b', true);
    expect(draft).toEqual({ grant: ['a'], deny: [] });
  });
});

describe('hasPermissionOverride', () => {
  it('detects grants and denies', () => {
    expect(hasPermissionOverride({ grant: ['x'], deny: [] }, 'x')).toBe(true);
    expect(hasPermissionOverride({ grant: [], deny: ['x'] }, 'x')).toBe(true);
    expect(hasPermissionOverride(none, 'x')).toBe(false);
  });
});
