import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

import type { MeResponse } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';
import '../../features/tables/tables.api.js';

import { applyDashboardBranchChange } from './apply-dashboard-branch-change.js';
import { branchPreferenceStorageKey } from './session-branch-preference.js';
import { hydrateFromMe, sessionReducer } from './session.slice.js';
import { testMeEntitlements } from './test-me-entitlements.js';

const orgId = '01932a1a-7b3e-7000-8000-000000000010';
const branchA = '01932a1a-7b3e-7000-8000-000000000030';
const branchB = '01932a1a-7b3e-7000-8000-000000000031';

const sampleMe: MeResponse = {
  user: {
    id: '01932a1a-7b3e-7000-8000-000000000001',
    email: 'owner@example.com',
    name: 'Owner',
    locale: 'en',
  },
  org: {
    id: orgId,
    name: 'Demo',
    slug: 'demo',
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    defaultCurrency: 'SAR',
    logoUrl: null,
  },
  role: { id: '01932a1a-7b3e-7000-8000-000000000020', key: 'owner', name: 'Owner' },
  permissions: ['branches.read'],
  branches: [
    { id: branchA, name: 'Main', slug: 'main', isActive: true },
    { id: branchB, name: 'Second', slug: 'second', isActive: true },
  ],
  orgs: [{ id: orgId, name: 'Demo', slug: 'demo' }],
  currentBranchId: branchA,
  entitlements: testMeEntitlements,
};

describe('applyDashboardBranchChange', () => {
  it('updates session branch, persists preference, and invalidates dining table cache', () => {
    localStorage.clear();
    const store = configureStore({
      reducer: {
        session: sessionReducer,
        [baseApi.reducerPath]: baseApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
    });
    store.dispatch(hydrateFromMe(sampleMe));

    applyDashboardBranchChange(store.dispatch, orgId, branchB);

    expect(store.getState().session.currentBranchId).toBe(branchB);
    expect(localStorage.getItem(branchPreferenceStorageKey(orgId))).toBe(branchB);
  });
});
