import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '../../features/session/RequireAuth.js';
import { MenuRoutes } from '../../features/menu/MenuRoutes.js';
import { DashboardHome } from './DashboardHome.js';
import { DashboardShell } from './DashboardShell.js';
import { useDashboardShell } from './use-dashboard-shell.js';

function DashboardLayout() {
  const shell = useDashboardShell();
  return <DashboardShell {...shell} />;
}

export default function DashboardArea() {
  return (
    <RequireAuth>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="menu/*" element={<MenuRoutes />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </RequireAuth>
  );
}
