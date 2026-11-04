import type { RootState } from '../../app/store.js';

export const selectAccessToken = (state: RootState) => state.session.accessToken;
export const selectBootstrapDone = (state: RootState) => state.session.bootstrapDone;
export const selectAdmin = (state: RootState) => state.session.admin;
