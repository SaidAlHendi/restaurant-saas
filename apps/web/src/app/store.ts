import { configureStore } from '@reduxjs/toolkit';

import { cartPersistenceListener } from '../features/cart/cart.listener.js';
import { cartReducer } from '../features/cart/cart.slice.js';
import { sessionReducer } from '../features/session/session.slice.js';
import { baseApi } from './api/base-api.js';
import '../features/auth/auth.api.js';
import '../features/menu/menu.api.js';
import '../features/tables/tables.api.js';
import '../features/pos/pos.api.js';
import '../features/orders/orders.api.js';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    cart: cartReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, cartPersistenceListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
