import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAppSelector } from '../../app/hooks.js';
import { BillingPage } from '../../features/billing/pages/BillingPage.js';
import { UpgradeRequiredPage } from '../../features/billing/pages/UpgradeRequiredPage.js';
import { MenuRoutes } from '../../features/menu/MenuRoutes.js';
import { selectCan, selectHasFeature } from '../../features/session/session.selectors.js';
import { BranchSettingsPage } from '../../features/settings/pages/BranchSettingsPage.js';
import { RestaurantSettingsPage } from '../../features/settings/pages/RestaurantSettingsPage.js';
import { SettingsIndexRedirect } from '../../features/settings/pages/SettingsIndexRedirect.js';
import { SettingsLayoutPage } from '../../features/settings/pages/SettingsLayoutPage.js';
import { StaffSettingsPage } from '../../features/settings/pages/StaffSettingsPage.js';
import { DashboardHome } from './DashboardHome.js';
import { DashboardShell } from './DashboardShell.js';
import { useDashboardShell } from './use-dashboard-shell.js';

const DashboardTodayPage = lazy(
  () => import('../../features/orders/pages/DashboardTodayPage.js'),
);
const DashboardOrdersPage = lazy(
  () => import('../../features/orders/pages/DashboardOrdersPage.js'),
);
const DashboardOrderDetailPage = lazy(
  () => import('../../features/orders/pages/DashboardOrderDetailPage.js'),
);

function DashboardLayout() {
  const shell = useDashboardShell();
  return <DashboardShell {...shell} />;
}

export default function DashboardArea() {
  const canReports = useAppSelector(selectCan('reports.read'));
  const hasReportsFeature = useAppSelector(selectHasFeature('reports.basic'));
  const showReports = canReports && hasReportsFeature;

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route
          index
          element={
            showReports ? <DashboardTodayPage /> : <DashboardHome />
          }
        />
        {showReports ? (
          <>
            <Route path="orders" element={<DashboardOrdersPage />} />
            <Route path="orders/:orderId" element={<DashboardOrderDetailPage />} />
          </>
        ) : null}
        {canReports && !hasReportsFeature ? (
          <Route path="orders/*" element={<UpgradeRequiredPage feature="reports.basic" />} />
        ) : null}
        <Route path="menu/*" element={<MenuRoutes />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsLayoutPage />}>
          <Route index element={<SettingsIndexRedirect />} />
          <Route path="restaurant" element={<RestaurantSettingsPage />} />
          <Route path="branch" element={<BranchSettingsPage />} />
          <Route path="staff" element={<StaffSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
