import { describe, expect, it } from 'vitest';

import type { MeResponse } from '@app/shared';

import {
  clearSession,
  hydrateFromMe,
  sessionReducer,
  setAccessToken,
  setBootstrapDone,
  setCurrentBranchId,
} from './session.slice.js';

const sampleMe: MeResponse = {
  user: {
    id: '01932a1a-7b3e-7000-8000-000000000001',
    email: 'owner@example.com',
    name: 'Owner',
    locale: 'en',
  },
  org: {
    id: '01932a1a-7b3e-7000-8000-000000000010',
    name: 'Demo',
    slug: 'demo',
  },
  role: {
    id: '01932a1a-7b3e-7000-8000-000000000020',
    key: 'owner',
    name: 'Owner',
  },
  permissions: ['branches.manage', 'branches.read'],
  branches: [
    {
      id: '01932a1a-7b3e-7000-8000-000000000030',
      name: 'Main',
      slug: 'main',
      isActive: true,
    },
  ],
  orgs: [{ id: '01932a1a-7b3e-7000-8000-000000000010', name: 'Demo', slug: 'demo' }],
  currentBranchId: '01932a1a-7b3e-7000-8000-000000000030',
};

describe('sessionReducer', () => {
  it('stores access token and bootstrap flag', () => {
    let state = sessionReducer(undefined, setAccessToken('jwt'));
    state = sessionReducer(state, setBootstrapDone(true));
    expect(state.accessToken).toBe('jwt');
    expect(state.bootstrapDone).toBe(true);
  });

  it('hydrates profile from /me', () => {
    const state = sessionReducer(undefined, hydrateFromMe(sampleMe));
    expect(state.user?.email).toBe('owner@example.com');
    expect(state.permissions).toContain('branches.manage');
    expect(state.currentBranchId).toBe(sampleMe.currentBranchId);
  });

  it('updates current branch id', () => {
    const branchId = '01932a1a-7b3e-7000-8000-000000000031';
    const state = sessionReducer(undefined, setCurrentBranchId(branchId));
    expect(state.currentBranchId).toBe(branchId);
  });

  it('clearSession keeps bootstrapDone true', () => {
    let state = sessionReducer(undefined, hydrateFromMe(sampleMe));
    state = sessionReducer(state, setAccessToken('jwt'));
    state = sessionReducer(state, clearSession());
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.bootstrapDone).toBe(true);
  });
});
