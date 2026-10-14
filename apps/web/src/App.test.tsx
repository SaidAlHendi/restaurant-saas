import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import type { MeResponse } from '@app/shared';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import {
  POS_DEVICE_LOCKED_STORAGE_KEY,
  writePosDeviceLocked,
} from './features/pos/pos-device-lock-storage.js';

import { appRoutes } from './app/router.js';
import { baseApi } from './app/api/base-api.js';
import {
  hydrateFromMe,
  sessionReducer,
  setAccessToken,
  setBootstrapDone,
} from './features/session/session.slice.js';
import { testMeEntitlements } from './features/session/test-me-entitlements.js';
import { initI18n, i18n } from './lib/i18n.js';
import { TooltipProvider } from '@app/ui';

const branchId = '01932a1a-7b3e-7000-8000-000000000030';
const orgId = '01932a1a-7b3e-7000-8000-000000000010';

const bootstrappedMe: MeResponse = {
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
  role: {
    id: '01932a1a-7b3e-7000-8000-000000000020',
    key: 'owner',
    name: 'Owner',
  },
  permissions: ['branches.read'],
  branches: [{ id: branchId, name: 'Main', slug: 'main', isActive: true }],
  orgs: [{ id: orgId, name: 'Demo', slug: 'demo' }],
  currentBranchId: branchId,
  entitlements: testMeEntitlements,
};

function createTestStore() {
  const testStore = configureStore({
    reducer: {
      session: sessionReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
  testStore.dispatch(setAccessToken('test-jwt'));
  testStore.dispatch(hydrateFromMe(bootstrappedMe));
  testStore.dispatch(setBootstrapDone(true));
  return testStore;
}

describe('App root', () => {
  afterEach(() => {
    window.localStorage.removeItem(POS_DEVICE_LOCKED_STORAGE_KEY);
  });

  it('redirects dashboard to POS when device lock flag is set', async () => {
    await initI18n();
    writePosDeviceLocked(true);
    await import('./areas/pos/PosArea.js');
    await import('./areas/dashboard/DashboardArea.js');
    const memoryRouter = createMemoryRouter(appRoutes, { initialEntries: ['/dashboard'] });
    render(
      <Provider store={createTestStore()}>
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>
            <RouterProvider router={memoryRouter} />
          </TooltipProvider>
        </I18nextProvider>
      </Provider>,
    );
    expect(await screen.findByRole('heading', { name: /enter your pin/i })).toBeInTheDocument();
    expect(memoryRouter.state.location.pathname).toMatch(/^\/pos/);
  });

  it('renders dashboard shell when session is bootstrapped', async () => {
    window.localStorage.removeItem(POS_DEVICE_LOCKED_STORAGE_KEY);
    await initI18n();
    // DashboardArea is lazy and now pulls in the menu feature; load it before render so the
    // Suspense fallback does not outlast findByText's 1s window on a slow CI runner.
    await import('./areas/dashboard/DashboardArea.js');
    const memoryRouter = createMemoryRouter(appRoutes, { initialEntries: ['/dashboard'] });
    render(
      <Provider store={createTestStore()}>
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>
            <RouterProvider router={memoryRouter} />
          </TooltipProvider>
        </I18nextProvider>
      </Provider>,
    );
    expect(await screen.findByText(/welcome,\s*owner/i)).toBeInTheDocument();
    // The shell: org name in the top bar, and sign out / dark mode / language in the sidebar.
    expect(screen.getByRole('heading', { name: 'Demo' })).toBeInTheDocument();
    const navList = screen.getAllByRole('complementary', { name: /dashboard navigation/i });
    expect(navList.length).toBeGreaterThan(0);
    const nav = navList[0];
    if (nav === undefined) {
      throw new Error('Expected dashboard navigation landmark');
    }
    expect(within(nav).getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /dark mode|light mode/i })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'العربية' })).toBeInTheDocument();
  });
});
