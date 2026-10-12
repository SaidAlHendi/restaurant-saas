import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import { useListBranchesQuery, usePatchBranchMutation } from '../../branches/branches.api.js';
import { showMenuApiError } from '../../menu/show-menu-api-error.js';
import { useAppSelector } from '../../../app/hooks.js';
import { selectCurrentBranchId } from '../../session/session.selectors.js';

export function useBranchSettingsPage() {
  const { t } = useTranslation();
  const branchId = useAppSelector(selectCurrentBranchId);
  const { data, isLoading, isError } = useListBranchesQuery(undefined);
  const [patchBranch, patchState] = usePatchBranchMutation();

  const branch = useMemo(
    () => data?.items.find((b) => b.id === branchId),
    [branchId, data?.items],
  );

  const [payBeforeSend, setPayBeforeSend] = useState(false);
  const [acceptsCard, setAcceptsCard] = useState(true);

  useEffect(() => {
    if (branch) {
      setPayBeforeSend(branch.payBeforeSend);
      setAcceptsCard(branch.acceptsCard);
    }
  }, [branch]);

  const onSave = useCallback(async () => {
    if (!branchId) {
      return;
    }
    const result = await patchBranch({
      branchId,
      body: { payBeforeSend, acceptsCard },
    });
    if ('error' in result) {
      showMenuApiError(result.error, t);
      return;
    }
    toast.success(t('settings.branch.saved'));
  }, [acceptsCard, branchId, patchBranch, payBeforeSend, t]);

  return {
    isLoading,
    isError,
    branchName: branch?.name ?? '',
    payBeforeSend,
    onPayBeforeSendChange: setPayBeforeSend,
    acceptsCard,
    onAcceptsCardChange: setAcceptsCard,
    saving: patchState.isLoading,
    onSave: () => {
      void onSave();
    },
    labels: {
      title: t('settings.branch.title'),
      description: t('settings.branch.description'),
      payBeforeSend: t('settings.branch.payBeforeSend'),
      payBeforeSendHint: t('settings.branch.payBeforeSendHint'),
      acceptsCard: t('settings.branch.acceptsCard'),
      acceptsCardHint: t('settings.branch.acceptsCardHint'),
      save: t('settings.branch.save'),
      loadError: t('settings.branch.loadError'),
      loading: t('common.loading'),
    },
  };
}

export type BranchSettingsPageViewModel = ReturnType<typeof useBranchSettingsPage>;
