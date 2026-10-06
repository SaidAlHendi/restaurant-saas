import { describe, expect, it } from 'vitest';

import type { RootState } from '../../app/store.js';

import { selectCan, selectIsAuthenticated } from './session.selectors.js';

function stateWith(permissions: string[], accessToken: string | null, hasUser: boolean): RootState {
  return {
    session: {
      accessToken,
      bootstrapDone: true,
      user: hasUser
        ? {
            id: '01932a1a-7b3e-7000-8000-000000000001',
            email: 'a@b.com',
            name: 'A',
            locale: 'en',
          }
        : null,
      org: null,
      role: null,
      permissions,
      branches: [],
      orgs: [],
      currentBranchId: null,
    },
    api: {} as RootState['api'],
  };
}

describe('session selectors', () => {
  it('selectIsAuthenticated requires token and user', () => {
    expect(selectIsAuthenticated(stateWith([], 'tok', true))).toBe(true);
    expect(selectIsAuthenticated(stateWith([], null, true))).toBe(false);
    expect(selectIsAuthenticated(stateWith([], 'tok', false))).toBe(false);
  });

  it('selectCan checks permission keys', () => {
    const state = stateWith(['branches.read'], 'tok', true);
    expect(selectCan('branches.read')(state)).toBe(true);
    expect(selectCan('branches.manage')(state)).toBe(false);
  });
});
