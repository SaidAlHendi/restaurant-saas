import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AdminUser } from '@app/shared';

import { baseApi } from '../app/api/base-api.js';
import RestaurantDetailPage from '../features/restaurants/RestaurantDetailPage.js';
import RestaurantsPage from '../features/restaurants/RestaurantsPage.js';
import '../features/restaurants/restaurants.api.js';
import { sessionReducer } from '../features/session/session.slice.js';
import { initI18n } from '../lib/i18n.js';

const ADMIN_ID = '0198f1a2-0000-7000-8000-0000000000aa';
const ORG_ID = '0198f1a2-0000-7000-8000-000000000001';

const listItem = {
  id: ORG_ID,
  name: 'Olive Cafe',
  slug: 'olive-cafe',
  status: 'suspended',
  country: 'SA',
  planKey: 'pro',
  planName: 'Pro',
  ownerName: 'Lina',
  ownerEmail: 'lina@example.com',
  branchCount: 2,
  createdAt: '2026-10-01T10:00:00.000Z',
};

const detail = {
  ...listItem,
  defaultCurrency: 'SAR',
  defaultLocale: 'ar',
  locales: ['ar', 'en'],
  memberCount: 4,
  subscription: {
    status: 'active',
    branchQuantity: 2,
    trialEndsAt: null,
    currentPeriodEnd: '2026-12-01T00:00:00.000Z',
    canceledAt: null,
  },
  branches: [
    { id: '0198f1a2-0000-7000-8000-000000000002', name: 'Main', slug: 'main', isActive: true },
  ],
};

function stubFetch(handler: (url: URL, method: string) => { status: number; body: unknown }) {
  const calls: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: Request) => {
      const url = new URL(input.url);
      calls.push(url);
      const { status, body } = handler(url, input.method);
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );
  return calls;
}

function renderAt(path: string, role: AdminUser['role'] = 'super') {
  const store = configureStore({
    reducer: { session: sessionReducer, [baseApi.reducerPath]: baseApi.reducer },
    preloadedState: {
      session: {
        accessToken: 'token',
        bootstrapDone: true,
        admin: { id: ADMIN_ID, email: 'a@sahtain.test', name: 'Admin', role },
      },
    },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('restaurants pages', () => {
  beforeAll(async () => {
    await initI18n();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lists restaurants from the API and sends URL filters as query params', async () => {
    const calls = stubFetch(() => ({
      status: 200,
      body: { items: [listItem], page: 1, pageSize: 20, total: 1 },
    }));
    renderAt('/restaurants?q=olive&status=suspended');

    expect(await screen.findByRole('link', { name: 'Olive Cafe' })).toHaveAttribute(
      'href',
      `/restaurants/${ORG_ID}`,
    );
    expect(screen.getByText('lina@example.com')).toBeInTheDocument();
    expect(document.querySelector('[data-status="suspended"]')).toHaveTextContent('Suspended');
    const url = calls[0];
    expect(url?.pathname).toBe('/v1/admin/orgs');
    expect(url?.searchParams.get('q')).toBe('olive');
    expect(url?.searchParams.get('status')).toBe('suspended');
    expect(url?.searchParams.get('page')).toBe('1');
  });

  it('shows the empty state when nothing matches', async () => {
    stubFetch(() => ({ status: 200, body: { items: [], page: 1, pageSize: 20, total: 0 } }));
    renderAt('/restaurants?q=zzz');
    expect(await screen.findByText('No matching restaurants')).toBeInTheDocument();
  });

  it('shows the detail page with owner and plan', async () => {
    stubFetch(() => ({ status: 200, body: detail }));
    renderAt(`/restaurants/${ORG_ID}`);
    expect(await screen.findByRole('heading', { name: /Olive Cafe/ })).toBeInTheDocument();
    expect(screen.getAllByText('lina@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0);
  });

  it('confirms, then reactivates a suspended restaurant and shows the new status', async () => {
    let status = 'suspended';
    const calls: string[] = [];
    stubFetch((url, method) => {
      if (method === 'POST') {
        calls.push(url.pathname);
        status = 'active';
        return { status: 200, body: { id: ORG_ID, status } };
      }
      return { status: 200, body: { ...detail, status } };
    });
    renderAt(`/restaurants/${ORG_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate' }));
    expect(calls).toEqual([]);
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Reactivate Olive Cafe?');
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Reactivate' }),
    );

    await waitFor(() => {
      expect(document.querySelector('[data-status="active"]')).toHaveTextContent('Active');
    });
    expect(calls).toEqual([`/v1/admin/orgs/${ORG_ID}/reactivate`]);
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeEnabled();
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const calls: string[] = [];
    stubFetch((url, method) => {
      if (method === 'POST') calls.push(url.pathname);
      return { status: 200, body: { ...detail, status: 'active' } };
    });
    renderAt(`/restaurants/${ORG_ID}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(calls).toEqual([]);
  });

  it('disables the button for non-super admins and for cancelled restaurants', async () => {
    stubFetch(() => ({ status: 200, body: { ...detail, status: 'active' } }));
    renderAt(`/restaurants/${ORG_ID}`, 'support');
    expect(await screen.findByRole('button', { name: 'Suspend' })).toBeDisabled();
    cleanup();

    stubFetch(() => ({ status: 200, body: { ...detail, status: 'cancelled' } }));
    renderAt(`/restaurants/${ORG_ID}`, 'super');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Suspend' })).toBeDisabled();
    });
  });

  it('shows not-found for a 404', async () => {
    stubFetch(() => ({ status: 404, body: { code: 'NOT_FOUND' } }));
    renderAt(`/restaurants/${ORG_ID}`);
    await waitFor(() => {
      expect(screen.getByText('Restaurant not found')).toBeInTheDocument();
    });
  });
});
