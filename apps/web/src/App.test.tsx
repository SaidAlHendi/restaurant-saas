import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import type { MeResponse } from '@app/shared';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { appRoutes } from './app/router.js';
import { baseApi } from './app/api/base-api.js';
import {
  hydrateFromMe,
  sessionReducer,
  setAccessToken,
  setBootstrapDone,
} from './features/session/session.slice.js';
import { initI18n, i18n } from './lib/i18n.js';

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
  it('renders dashboard shell when session is bootstrapped', async () => {
    await initI18n();
    const memoryRouter = createMemoryRouter(appRoutes, { initialEntries: ['/dashboard'] });
    render(
      <Provider store={createTestStore()}>
        <I18nextProvider i18n={i18n}>
          <RouterProvider router={memoryRouter} />
        </I18nextProvider>
      </Provider>,
    );
    expect(screen.getByRole('heading', { name: /restaurant saas/i })).toBeInTheDocument();
    expect(await screen.findByText(/welcome,\s*owner/i)).toBeInTheDocument();
  });
});
