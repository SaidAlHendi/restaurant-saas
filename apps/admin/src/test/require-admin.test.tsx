import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';

import { initI18n } from '../lib/i18n.js';

import { RequireAdmin } from '../features/session/RequireAdmin.js';
import { sessionReducer, type SessionState } from '../features/session/session.slice.js';

function renderAt(session: SessionState) {
  const store = configureStore({
    reducer: { session: sessionReducer },
    preloadedState: { session },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route
            path="/dashboard"
            element={
              <RequireAdmin>
                <p>secret</p>
              </RequireAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('RequireAdmin', () => {
  beforeAll(async () => {
    await initI18n();
  });

  it('redirects to /login without an access token', () => {
    renderAt({ accessToken: null, bootstrapDone: true, admin: null });
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders the page with an access token', () => {
    renderAt({ accessToken: 't', bootstrapDone: true, admin: null });
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
