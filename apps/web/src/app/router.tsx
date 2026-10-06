import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { App } from '../App.js';

const AuthArea = lazy(() => import('../areas/auth/AuthArea.js'));
const DashboardArea = lazy(() => import('../areas/dashboard/DashboardArea.js'));
const PosArea = lazy(() => import('../areas/pos/PosArea.js'));
const KdsArea = lazy(() => import('../areas/kds/KdsArea.js'));
const AdminArea = lazy(() => import('../areas/admin/AdminArea.js'));

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
];

export const router = createBrowserRouter(appRoutes);
