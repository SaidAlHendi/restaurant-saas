import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { MeResponse } from '@app/shared';

export type SessionUser = MeResponse['user'];
export type SessionOrg = MeResponse['org'];
export type SessionRole = MeResponse['role'];
export type SessionBranch = MeResponse['branches'][number];
export type SessionOrgOption = MeResponse['orgs'][number];

export type SessionState = {
  accessToken: string | null;
  bootstrapDone: boolean;
  user: SessionUser | null;
  org: SessionOrg | null;
  role: SessionRole | null;
  permissions: string[];
  branches: SessionBranch[];
  orgs: SessionOrgOption[];
  currentBranchId: string | null;
};

const initialState: SessionState = {
  accessToken: null,
  bootstrapDone: false,
  user: null,
  org: null,
  role: null,
  permissions: [],
  branches: [],
  orgs: [],
  currentBranchId: null,
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
    hydrateFromMe(state, action: PayloadAction<MeResponse>) {
      const me = action.payload;
      state.user = me.user;
      state.org = me.org;
      state.role = me.role;
      state.permissions = me.permissions;
      state.branches = me.branches;
      state.orgs = me.orgs;
      state.currentBranchId = me.currentBranchId;
    },
    setCurrentBranchId(state, action: PayloadAction<string | null>) {
      state.currentBranchId = action.payload;
    },
    clearSession() {
      return { ...initialState, bootstrapDone: true };
    },
  },
});

export const {
  setAccessToken,
  setBootstrapDone,
  hydrateFromMe,
  setCurrentBranchId,
  clearSession,
} = sessionSlice.actions;

export const sessionReducer = sessionSlice.reducer;
