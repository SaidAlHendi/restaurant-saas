import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../app/hooks.js';
import { applyDashboardBranchChange } from '../../features/session/apply-dashboard-branch-change.js';
import {
  selectCurrentBranchId,
  selectSessionBranches,
  selectSessionOrg,
  selectSessionUser,
} from '../../features/session/session.selectors.js';
import { localizedName } from '../../lib/localized-name.js';
import { dashboardTitleKey, initialsOf } from './dashboard-shell.utils.js';

/** Dashboard top bar: the branch switcher. Navigation lives in the app shell. */
export function useDashboardShell() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const user = useAppSelector(selectSessionUser);
  const dispatch = useAppDispatch();
  const org = useAppSelector(selectSessionOrg);
  const branches = useAppSelector(selectSessionBranches);
  const currentBranchId = useAppSelector(selectCurrentBranchId);

  const branchSwitcher = useMemo(
    () => ({
      branches: branches.map((b) => ({ id: b.id, name: localizedName(b.name, i18n.language) })),
      value: currentBranchId,
      ariaLabel: t('dashboard.branchSwitcherLabel'),
      placeholder: t('dashboard.selectBranch'),
    }),
    [branches, currentBranchId, i18n.language, t],
  );

  const onBranchChange = useCallback(
    (branchId: string) => {
      if (org === null) {
        return;
      }
      applyDashboardBranchChange(dispatch, org.id, branchId);
    },
    [dispatch, org],
  );

  return {
    title: org ? localizedName(org.name, i18n.language) : t('app.title'),
    pageTitle: t(dashboardTitleKey(location.pathname)),
    breadcrumb: `${t('app.title')} / ${t('shell.ownerArea')}`,
    userInitials: initialsOf(user?.name ?? ''),
    branchSwitcher,
    onBranchChange,
  };
}

export type DashboardShellViewModel = ReturnType<typeof useDashboardShell>;
