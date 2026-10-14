import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import type { MeResponse } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';
import '../../features/tables/tables.api.js';
import { branchPreferenceStorageKey } from '../../features/session/session-branch-preference.js';
import { hydrateFromMe, sessionReducer } from '../../features/session/session.slice.js';
import { testMeEntitlements } from '../../features/session/test-me-entitlements.js';
import { i18n, initI18n } from '../../lib/i18n.js';

import { useDashboardShell } from './use-dashboard-shell.js';

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
    locales: ['en'],
    defaultCurrency: 'SAR',
    logoUrl: null,
  },
  role: { id: '01932a1a-7b3e-7000-8000-000000000020', key: 'owner', name: 'Owner' },
  permissions: ['menu.read', 'branches.read'],
  branches: [
    { id: branchA, name: 'Main', slug: 'main', isActive: true },
    { id: branchB, name: 'Second', slug: 'second', isActive: true },
  ],
  orgs: [{ id: orgId, name: 'Demo', slug: 'demo' }],
  currentBranchId: branchA,
  entitlements: testMeEntitlements,
};

function createTestContext() {
  const store = configureStore({
    reducer: {
      session: sessionReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
  store.dispatch(hydrateFromMe(sampleMe));

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(Provider, {
      store,
      children: createElement(I18nextProvider, {
        i18n,
        children: createElement(MemoryRouter, { initialEntries: ['/dashboard/menu/tables'] }, children),
      }),
    });
  }

  return { store, Wrapper };
}

describe('useDashboardShell', () => {
  beforeAll(async () => {
    await initI18n();
  });

  it('onBranchChange updates branch and persists preference', () => {
    localStorage.clear();
    const { store, Wrapper } = createTestContext();
    const { result } = renderHook(() => useDashboardShell(), { wrapper: Wrapper });

    expect(result.current.branchSwitcher.value).toBe(branchA);

    act(() => {
      result.current.onBranchChange(branchB);
    });

    expect(store.getState().session.currentBranchId).toBe(branchB);
    expect(localStorage.getItem(branchPreferenceStorageKey(orgId))).toBe(branchB);
  });
});
