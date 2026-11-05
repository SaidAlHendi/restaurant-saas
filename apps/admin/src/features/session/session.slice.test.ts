import { describe, expect, it } from 'vitest';

import {
  clearSession,
  sessionReducer,
  setAccessToken,
  setAdmin,
  setBootstrapDone,
} from './session.slice.js';

const admin = {
  id: '3f6c1b64-3f0e-4b8e-9c55-0e0d9a1f2a11',
  email: 'a@example.com',
  name: 'Ada',
  role: 'super' as const,
};

describe('session slice', () => {
  it('starts signed out and not bootstrapped', () => {
    const state = sessionReducer(undefined, { type: 'init' });
    expect(state).toEqual({ accessToken: null, bootstrapDone: false, admin: null });
  });

  it('stores token and admin, then clears them but keeps bootstrapDone', () => {
    let state = sessionReducer(undefined, setAccessToken('t'));
    state = sessionReducer(state, setAdmin(admin));
    state = sessionReducer(state, setBootstrapDone(true));
    expect(state.admin?.name).toBe('Ada');
    state = sessionReducer(state, clearSession());
    expect(state).toEqual({ accessToken: null, bootstrapDone: true, admin: null });
  });
});
