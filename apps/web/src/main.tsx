import '@app/ui/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { store } from './app/store.js';
import { router } from './app/router.js';
import { initI18n } from './lib/i18n.js';

void initI18n().then(() => {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </StrictMode>,
  );
});
