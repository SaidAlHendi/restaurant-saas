import { configureStore } from '@reduxjs/toolkit';

import { sessionReducer } from '../features/session/session.slice.js';
import { baseApi } from './api/base-api.js';
import '../features/auth/auth.api.js';
import '../features/menu/menu.api.js';
import '../features/tables/tables.api.js';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
