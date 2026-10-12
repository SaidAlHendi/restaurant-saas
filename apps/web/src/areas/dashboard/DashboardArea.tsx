import { Navigate, Route, Routes } from 'react-router-dom';

import { MenuRoutes } from '../../features/menu/MenuRoutes.js';
import { BranchSettingsPage } from '../../features/settings/pages/BranchSettingsPage.js';
import { DashboardHome } from './DashboardHome.js';
import { DashboardShell } from './DashboardShell.js';
import { useDashboardShell } from './use-dashboard-shell.js';

function DashboardLayout() {
  const shell = useDashboardShell();
  return <DashboardShell {...shell} />;
}

export default function DashboardArea() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="menu/*" element={<MenuRoutes />} />
        <Route path="settings/branch" element={<BranchSettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
