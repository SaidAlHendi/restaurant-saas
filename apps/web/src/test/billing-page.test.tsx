import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import type { BillingOverviewResponse, MeResponse } from '@app/shared';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@app/ui';

import { baseApi } from '../app/api/base-api.js';
import { i18n, initI18n } from '../lib/i18n.js';
import { hydrateFromMe, sessionReducer, setAccessToken } from '../features/session/session.slice.js';
import { testMeEntitlements } from '../features/session/test-me-entitlements.js';
import { NOW, isoInDays, overview, paidOverview } from '../features/billing/billing.test-fixtures.js';
import { BillingPage } from '../features/billing/pages/BillingPage.js';

let overviewData: BillingOverviewResponse | undefined;

vi.mock('../features/billing/billing.api.js', () => {
  const mutation = () => [vi.fn(), { isLoading: false }];
  return {
    useGetBillingOverviewQuery: () => ({
      data: overviewData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useStartCheckoutMutation: mutation,
    useChangePlanMutation: mutation,
    useOpenPortalMutation: mutation,
  };
});

const orgId = '01932a1a-7b3e-7000-8000-000000000010';

const ownerMe: MeResponse = {
  user: { id: '01932a1a-7b3e-7000-8000-000000000001', email: 'o@x.com', name: 'Owner', locale: 'en' },
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
  permissions: ['billing.manage'],
  branches: [],
  orgs: [{ id: orgId, name: 'Demo', slug: 'demo' }],
  currentBranchId: null,
  entitlements: testMeEntitlements,
};

function renderPage(data: BillingOverviewResponse) {
  overviewData = data;
  const store = configureStore({
    reducer: { session: sessionReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
  store.dispatch(setAccessToken('t'));
  store.dispatch(hydrateFromMe(ownerMe));
  render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>
          <MemoryRouter>
            <BillingPage />
          </MemoryRouter>
        </TooltipProvider>
      </I18nextProvider>
    </Provider>,
  );
  return store;
}

describe('BillingPage', () => {
  beforeAll(async () => {
    await initI18n();
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
  });

  it('trial: shows days left and Subscribe buttons', () => {
    // The page counts days from the real clock; pin it to the fixtures' NOW.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    renderPage(overview({ entitlements: { trialEndsAt: isoInDays(10) } }));
    vi.useRealTimers();
    expect(screen.getByText('10 days left in your trial')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Subscribe' })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Manage subscription' })).not.toBeInTheDocument();
  });

  it('paid: renewal date, plan switching and the portal', () => {
    renderPage(paidOverview('restaurant'));
    expect(screen.getByText(/^Renews on /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current plan' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Switch to this plan' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Cancel and move to Free' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Manage subscription' })).toBeEnabled();
  });

  it('past due: shows the payment alert', () => {
    renderPage(
      paidOverview('restaurant', { entitlements: { reason: 'past_due', status: 'past_due' } }),
    );
    expect(screen.getByText('Your last payment failed')).toBeInTheDocument();
  });

  it('scheduled cancel: shows the end date and "Keep my plan"', () => {
    renderPage(
      paidOverview('restaurant', {
        subscription: {
          scheduledChange: { action: 'cancel', effective_at: isoInDays(20), resume_at: null },
        },
      }),
    );
    expect(screen.getByText(/^Ends on /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep my plan' })).toBeEnabled();
  });

  it('checkout disabled: a note instead of plan buttons', () => {
    renderPage(overview({ checkoutEnabled: false }));
    expect(screen.getByText(/Online payment is not set up yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument();
  });

  it('copies the fresh entitlements into the session', () => {
    const store = renderPage(paidOverview('business'));
    expect(store.getState().session.entitlements?.planKey).toBe('business');
  });
});
