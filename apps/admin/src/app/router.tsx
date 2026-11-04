import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { App } from '../App.js';
import { GuestLayout } from '../features/auth/GuestLayout.js';
import { RequireAdmin } from '../features/session/RequireAdmin.js';
import { AdminShellLayout } from '../features/shell/AdminShellLayout.js';

const LoginPage = lazy(() => import('../features/auth/LoginPage.js'));
const OverviewPage = lazy(() => import('../features/overview/OverviewPage.js'));
const ComingSoonPage = lazy(() => import('../features/placeholders/ComingSoonPage.js'));

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <GuestLayout />,
        children: [{ path: 'login', element: <LoginPage /> }],
      },
      {
        // Route protection: RequireAdmin waits for the session bootstrap, then sends
        // anyone without a valid admin session to /login.
        element: (
          <RequireAdmin>
            <AdminShellLayout />
          </RequireAdmin>
        ),
        children: [
          { path: 'dashboard', element: <OverviewPage /> },
          { path: 'coming-soon/:section', element: <ComingSoonPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
