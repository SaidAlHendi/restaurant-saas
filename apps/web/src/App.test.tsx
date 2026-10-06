import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { appRoutes } from './app/router.js';
import { initI18n, i18n } from './lib/i18n.js';

describe('App root', () => {
  it('renders root shell via router', async () => {
    await initI18n();
    const memoryRouter = createMemoryRouter(appRoutes, { initialEntries: ['/dashboard'] });
    render(
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={memoryRouter} />
      </I18nextProvider>,
    );
    expect(screen.getByRole('heading', { name: /restaurant saas/i })).toBeInTheDocument();
  });
});
