import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { baseApi } from '../app/api/base-api.js';
import OverviewPage from '../features/overview/OverviewPage.js';
import '../features/overview/overview.api.js';
import { sessionReducer } from '../features/session/session.slice.js';
import { initI18n } from '../lib/i18n.js';

const overview = {
  generatedAt: '2026-11-08T12:00:00.000Z',
  orgsByStatus: { trial: 2, active: 5, past_due: 1, suspended: 1, cancelled: 0 },
  orgsTotal: 9,
  activeSubscriptions: 6,
  trials: 2,
  mrr: [{ currency: 'USD', amountMinor: 123400 }],
  churned30d: 1,
  churnRate30d: 1 / 7,
  planMix: [
    { planKey: 'pro', planName: 'Pro', currency: 'USD', subscriptions: 4, mrrMinor: 100000 },
    { planKey: 'basic', planName: 'Basic', currency: 'USD', subscriptions: 2, mrrMinor: 23400 },
  ],
  orders24h: 321,
  activeOrgs24h: 4,
};

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  );
}

function renderPage() {
  const store = configureStore({
    reducer: { session: sessionReducer, [baseApi.reducerPath]: baseApi.reducer },
    preloadedState: {
      session: {
        accessToken: 'token',
        bootstrapDone: true,
        admin: {
          id: '0198f1a2-0000-7000-8000-0000000000aa',
          email: 'a@sahtain.test',
          name: 'Admin',
          role: 'support' as const,
        },
      },
    },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('overview page', () => {
  beforeAll(async () => {
    await initI18n();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows KPIs, plan mix and 24h activity', async () => {
    stubFetch(200, overview);
    renderPage();

    const kpis = await screen.findByTestId('overview-kpis');
    expect(within(kpis).getByText('$1,234.00')).toBeInTheDocument();
    expect(within(kpis).getByText('9')).toBeInTheDocument();
    expect(within(kpis).getByText('14.3%')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('321')).toBeInTheDocument();
  });

  it('shows an empty plan mix and a dash when churn has no base', async () => {
    stubFetch(200, {
      ...overview,
      planMix: [],
      activeSubscriptions: 0,
      churned30d: 0,
      churnRate30d: null,
    });
    renderPage();

    expect(await screen.findByText('No live subscriptions yet.')).toBeInTheDocument();
    expect(within(screen.getByTestId('overview-kpis')).getByText('—')).toBeInTheDocument();
  });

  it('offers a retry when loading fails', async () => {
    stubFetch(500, { error: { code: 'INTERNAL', message: 'boom' } });
    renderPage();

    expect(await screen.findByText('Could not load platform numbers.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
