import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { showApiError } from '../../../lib/show-api-error.js';
import { useCreateBranchMutation, useListBranchesQuery } from '../../branches/branches.api.js';
import { applyDashboardBranchChange } from '../../session/apply-dashboard-branch-change.js';
import { selectCurrentBranchId, selectSessionOrg } from '../../session/session.selectors.js';
import { BRANCH_TIMEZONE_OPTIONS } from '../branch-timezone.utils.js';

export function useNewBranchDialog() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const org = useAppSelector(selectSessionOrg);
  const currentBranchId = useAppSelector(selectCurrentBranchId);
  const { data } = useListBranchesQuery(undefined);
  const [createBranch, createState] = useCreateBranchMutation();

  const current = data?.items.find((b) => b.id === currentBranchId) ?? data?.items[0];

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState<string>(current?.timezone ?? 'Asia/Riyadh');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        setName('');
        setErrorKey(null);
        setTimezone(current?.timezone ?? 'Asia/Riyadh');
      }
    },
    [current?.timezone],
  );

  const onSubmit = useCallback(async () => {
    const trimmed = name.trim();
    const currency = current?.currency ?? org?.defaultCurrency;
    if (trimmed.length === 0) {
      setErrorKey('settings.branch.newBranchNameRequired');
      return;
    }
    if (!currency || !org) {
      return;
    }
    const result = await createBranch({
      name: trimmed,
      timezone,
      currency,
      taxRateBp: current?.taxRateBp ?? 0,
      taxInclusive: current?.taxInclusive ?? false,
      dayStartHour: current?.dayStartHour ?? 4,
    });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    applyDashboardBranchChange(dispatch, org.id, result.data.id);
    toast.success(t('settings.branch.newBranchCreated'));
    setOpen(false);
  }, [createBranch, current, dispatch, name, org, t, timezone]);

  return {
    open,
    onOpenChange,
    name,
    onNameChange: (value: string) => {
      setName(value);
      setErrorKey(null);
    },
    timezone,
    onTimezoneChange: setTimezone,
    timezoneOptions: [...new Set([timezone, ...BRANCH_TIMEZONE_OPTIONS])],
    error: errorKey ? t(errorKey) : null,
    submitting: createState.isLoading,
    onSubmit: () => {
      void onSubmit();
    },
    labels: {
      trigger: t('settings.branch.newBranch'),
      title: t('settings.branch.newBranchTitle'),
      description: t('settings.branch.newBranchDescription'),
      name: t('settings.branch.newBranchName'),
      namePlaceholder: t('settings.branch.newBranchNamePlaceholder'),
      timezone: t('settings.branch.newBranchTimezone'),
      create: t('settings.branch.newBranchCreate'),
      cancel: t('settings.branch.newBranchCancel'),
    },
  };
}

export type NewBranchDialogViewModel = ReturnType<typeof useNewBranchDialog>;
