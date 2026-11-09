import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { toast } from '@app/ui';

import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { applyDashboardBranchChange } from '../../session/apply-dashboard-branch-change.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import { useListBranchesQuery } from '../branches.api.js';

export function useBranchesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const allowed = useAppSelector(selectCan('branches.manage'));
  const org = useAppSelector(selectSessionOrg);
  const currentBranchId = useAppSelector(selectCurrentBranchId);
  const { data, isLoading, isError } = useListBranchesQuery(undefined, { skip: !allowed });

  const items = useMemo(
    () =>
      (data?.items ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        timezone: b.timezone,
        isActive: b.isActive,
        isCurrent: b.id === currentBranchId,
      })),
    [currentBranchId, data?.items],
  );

  const onOpen = useCallback(
    (id: string) => {
      void navigate(`/dashboard/branches/${id}`);
    },
    [navigate],
  );

  const onSwitch = useCallback(
    (id: string) => {
      if (org === null) {
        return;
      }
      applyDashboardBranchChange(dispatch, org.id, id);
      toast.success(t('branches.switchedTo'));
    },
    [dispatch, org, t],
  );

  return {
    redirectTo: allowed ? null : '/dashboard',
    isLoading: allowed ? isLoading : false,
    isError,
    items,
    onOpen,
    onSwitch,
    labels: {
      title: t('branches.title'),
      description: t('branches.description'),
      current: t('branches.current'),
      inactive: t('branches.inactive'),
      switchTo: t('branches.switch'),
      settings: t('branches.settings'),
      noAddress: t('branches.address'),
      loadError: t('branches.loadError'),
      empty: t('branches.empty'),
      loading: t('common.loading'),
    },
  };
}

export type BranchesPageViewModel = ReturnType<typeof useBranchesPage>;
