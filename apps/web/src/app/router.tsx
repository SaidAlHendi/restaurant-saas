import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { App } from '../App.js';
import { RequireAuth } from '../features/session/RequireAuth.js';

const LoginPage = lazy(() => import('../areas/auth/LoginPage.js'));
const SignupPage = lazy(() => import('../areas/auth/SignupPage.js'));
const DashboardArea = lazy(() => import('../areas/dashboard/DashboardArea.js'));
const PosArea = lazy(() => import('../areas/pos/PosArea.js'));
const KdsArea = lazy(() => import('../areas/kds/KdsArea.js'));
const AdminArea = lazy(() => import('../areas/admin/AdminArea.js'));

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        HydrateFallback: () => null,
        lazy: async () => ({ Component: (await import('../areas/dev-ui/DevUiPage.js')).default }),
      },
    ]
  : [];

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'auth/*', element: <Navigate to="/login" replace /> },
      { path: 'dashboard/*', element: <DashboardArea /> },
      {
        path: 'pos/*',
        element: (
          <RequireAuth>
            <PosArea />
          </RequireAuth>
        ),
      },
      {
        path: 'kds/*',
        element: (
          <RequireAuth>
            <KdsArea />
          </RequireAuth>
        ),
      },
      {
        path: 'admin/*',
        element: (
          <RequireAuth>
            <AdminArea />
          </RequireAuth>
        ),
      },
    ],
  },
  ...devRoutes,
];

export const router = createBrowserRouter(appRoutes);
