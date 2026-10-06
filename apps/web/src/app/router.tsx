import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { App } from '../App.js';

const AuthArea = lazy(() => import('../areas/auth/AuthArea.js'));
const DashboardArea = lazy(() => import('../areas/dashboard/DashboardArea.js'));
const PosArea = lazy(() => import('../areas/pos/PosArea.js'));
const KdsArea = lazy(() => import('../areas/kds/KdsArea.js'));
const AdminArea = lazy(() => import('../areas/admin/AdminArea.js'));

// UI kit showcase for review. `import.meta.env.DEV` is false in production builds, so Vite drops it.
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
      { path: 'auth/*', element: <AuthArea /> },
      { path: 'dashboard/*', element: <DashboardArea /> },
      { path: 'pos/*', element: <PosArea /> },
      { path: 'kds/*', element: <KdsArea /> },
      { path: 'admin/*', element: <AdminArea /> },
    ],
  },
  ...devRoutes,
];

export const router = createBrowserRouter(appRoutes);
