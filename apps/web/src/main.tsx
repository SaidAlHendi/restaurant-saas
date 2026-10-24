import '@fontsource-variable/readex-pro';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@app/ui/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { AppProviders } from './app/AppProviders.js';
import { store } from './app/store.js';
import { router } from './app/router.js';
import { SessionBootstrap } from './features/session/SessionBootstrap.js';
import { initI18n } from './lib/i18n.js';

void initI18n().then(() => {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <SessionBootstrap>
          <AppProviders>
            <RouterProvider router={router} />
          </AppProviders>
        </SessionBootstrap>
      </Provider>
    </StrictMode>,
  );
});
