import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { baseApi } from '../app/api/base-api.js';
import AuditPage from '../features/audit/AuditPage.js';
import PlansPage from '../features/plans/PlansPage.js';
import { sessionReducer } from '../features/session/session.slice.js';
import SubscriptionsPage from '../features/subscriptions/SubscriptionsPage.js';
import UsersPage from '../features/users/UsersPage.js';
import { initI18n } from '../lib/i18n.js';

const ID = '0198f1a2-0000-7000-8000-000000000001';
const ORG = '0198f1a2-0000-7000-8000-000000000002';

function stubFetch(handler: (url: URL) => unknown) {
  const calls: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: Request) => {
      const url = new URL(input.url);
      calls.push(url);
      return Promise.resolve(
        new Response(JSON.stringify(handler(url)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );
  return calls;
}

function renderAt(path: string, element: React.ReactNode, route: string) {
  const store = configureStore({
    reducer: { session: sessionReducer, [baseApi.reducerPath]: baseApi.reducer },
    preloadedState: {
      session: {
        accessToken: 'token',
        bootstrapDone: true,
        admin: { id: ID, email: 'a@sahtain.test', name: 'Admin', role: 'super' as const },
      },
    },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('directory pages', () => {
  beforeAll(async () => {
    await initI18n();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('users: lists memberships and follows the cursor', async () => {
    let page = 0;
    const calls = stubFetch((url) => {
      if (url.searchParams.get('cursor')) page = 2;
      return {
        items: [
          {
            id: ID,
            name: page === 2 ? 'Second User' : 'Lina',
            email: 'lina@example.com',
            createdAt: '2026-10-01T10:00:00.000Z',
            lastLoginAt: null,
            memberships: [
              {
                orgId: ORG,
                orgName: 'Olive Cafe',
                roleKey: 'owner',
                roleName: 'Owner',
                status: 'active',
              },
            ],
          },
        ],
        nextCursor: page === 2 ? null : 'abc',
      };
    });
    renderAt('/users', <UsersPage />, '/users');
    expect(await screen.findByText('Lina')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Olive Cafe' })).toHaveAttribute(
      'href',
      `/restaurants/${ORG}`,
    );
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(calls[0]?.pathname).toBe('/v1/admin/users');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Second User')).toBeInTheDocument();
    expect(calls.at(-1)?.searchParams.get('cursor')).toBe('abc');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('subscriptions: sends status and plan filters from the URL', async () => {
    const calls = stubFetch(() => ({
      items: [
        {
          id: ID,
          orgId: ORG,
          orgName: 'Olive Cafe',
          planKey: 'restaurant',
          planName: 'Restaurant',
          status: 'past_due',
          trialEndsAt: null,
          currentPeriodEnd: '2026-12-01T00:00:00.000Z',
          providerSubscriptionId: 'sub_123',
        },
      ],
    }));
    renderAt(
      '/subscriptions?status=past_due&plan=restaurant',
      <SubscriptionsPage />,
      '/subscriptions',
    );
    expect(await screen.findByText('sub_123')).toBeInTheDocument();
    expect(document.querySelector('[data-status="past_due"]')).toHaveTextContent('Past due');
    expect(calls[0]?.searchParams.get('status')).toBe('past_due');
    expect(calls[0]?.searchParams.get('plan')).toBe('restaurant');
  });

  it('subscriptions: trial_ending maps to the trialEnding flag', async () => {
    const calls = stubFetch(() => ({ items: [] }));
    renderAt('/subscriptions?status=trial_ending', <SubscriptionsPage />, '/subscriptions');
    expect(await screen.findByText('No matching subscriptions')).toBeInTheDocument();
    expect(calls[0]?.searchParams.get('trialEnding')).toBe('true');
    expect(calls[0]?.searchParams.has('status')).toBe(false);
  });

  it('plans: shows prices and limits', async () => {
    stubFetch(() => ({
      items: [
        {
          id: ID,
          key: 'restaurant',
          name: 'Restaurant',
          priceMinor: 2900,
          currency: 'USD',
          interval: 'month',
          perBranch: true,
          isPublic: true,
          features: [
            { key: 'branches', limit: 3 },
            { key: 'reports', limit: null },
          ],
        },
      ],
    }));
    renderAt('/plans', <PlansPage />, '/plans');
    expect(await screen.findByText('$29.00', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('audit: renders rows and passes filters', async () => {
    const calls = stubFetch(() => ({
      items: [
        {
          id: ID,
          createdAt: '2026-11-08T10:00:00.000Z',
          actorId: ID,
          actorName: 'Admin One',
          actorEmail: 'one@sahtain.test',
          actorRole: 'super',
          action: 'org.suspend',
          targetType: 'organization',
          targetId: ORG,
          orgId: ORG,
          ip: '10.0.0.1',
        },
      ],
      nextCursor: null,
    }));
    renderAt('/audit', <AuditPage />, '/audit');
    expect(await screen.findByText('org.suspend')).toBeInTheDocument();
    expect(screen.getByText('one@sahtain.test')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Filter by action, e.g. org.suspend'), {
      target: { value: 'org.' },
    });
    await waitFor(() => {
      expect(calls.some((c) => c.searchParams.get('action') === 'org.')).toBe(true);
    });
  });
});
