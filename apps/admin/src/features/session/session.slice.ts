import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AdminUser } from '@app/shared';

export type SessionState = {
  accessToken: string | null;
  bootstrapDone: boolean;
  admin: AdminUser | null;
};

const initialState: SessionState = {
  accessToken: null,
  bootstrapDone: false,
  admin: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string | null>) {
      state.accessToken = action.payload;
    },
    setBootstrapDone(state, action: PayloadAction<boolean>) {
      state.bootstrapDone = action.payload;
    },
    setAdmin(state, action: PayloadAction<AdminUser>) {
      state.admin = action.payload;
    },
    clearSession() {
      return { ...initialState, bootstrapDone: true };
    },
  },
});

export const { setAccessToken, setBootstrapDone, setAdmin, clearSession } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
