import { useCallback, useEffect, useMemo, useState, type BaseSyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../app/hooks.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionBranches,
} from '../../session/session.selectors.js';
import { isMutationError } from '../../menu/menu-mutation-result.js';
import { showMenuApiError } from '../../menu/show-menu-api-error.js';
import type { TablesPageViewProps } from '../components/TablesPageView.js';
import {
  useCreateDiningTableMutation,
  useListDiningTablesQuery,
  usePatchDiningTableMutation,
  useRotateTableQrMutation,
} from '../tables.api.js';
import { useTableForm } from './use-table-form.js';

export function useTablesScreen(): TablesPageViewProps {
  const { t } = useTranslation();
  const canManage = useAppSelector(selectCan('branches.manage'));
  const branchId = useAppSelector(selectCurrentBranchId);
  const branches = useAppSelector(selectSessionBranches);

  const branchMissing = branchId === null;
  const { data, isLoading } = useListDiningTablesQuery(branchId ?? '', {
    skip: branchMissing,
  });
  const items = data?.items ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [togglingTableId, setTogglingTableId] = useState<string | null>(null);
  const [rotatingTableId, setRotatingTableId] = useState<string | null>(null);
  const form = useTableForm();
  const [createTable, createState] = useCreateDiningTableMutation();
  const [patchTable] = usePatchDiningTableMutation();
  const [rotateQr] = useRotateTableQrMutation();

  useEffect(() => {
    if (formOpen) {
      form.reset({ label: '' });
    }
  }, [form, formOpen]);

  const onSubmit = useCallback(
    (event?: BaseSyntheticEvent) => {
      void form.handleSubmit((values) => {
        if (branchId === null) {
          return;
        }
        void createTable({ branchId, body: { label: values.label } }).then((result) => {
          if (isMutationError(result)) {
            showMenuApiError(result.error, t);
            return;
          }
          setFormOpen(false);
        });
      })(event);
    },
    [branchId, createTable, form, t],
  );

  const onToggleActive = useCallback(
    (table: (typeof items)[number], next: boolean) => {
      if (branchId === null) {
        return;
      }
      setTogglingTableId(table.id);
      void patchTable({
        branchId,
        tableId: table.id,
        body: { isActive: next },
      }).then((result) => {
        setTogglingTableId(null);
        if (isMutationError(result)) {
          showMenuApiError(result.error, t);
        }
      });
    },
    [branchId, patchTable, t],
  );

  const branchName = useMemo(() => {
    if (branchId === null) {
      return '';
    }
    return branches.find((b) => b.id === branchId)?.name ?? '';
  }, [branchId, branches]);

  return {
    title: t('menu.tables.title'),
    subtitle: branchMissing ? t('menu.tables.subtitle') : t('menu.tables.subtitleBranch', { branch: branchName }),
    canManage,
    isLoading: !branchMissing && isLoading,
    branchMissing,
    branchMissingTitle: t('menu.tables.noBranchTitle'),
    branchMissingDescription: t('menu.tables.noBranchDescription'),
    items,
    addLabel: t('menu.tables.add'),
    emptyTitle: t('menu.tables.emptyTitle'),
    emptyDescription: t('menu.tables.emptyDescription'),
    tableLabelHeader: t('menu.tables.labelColumn'),
    statusHeader: t('menu.tables.statusColumn'),
    activeLabel: t('menu.status.active'),
    inactiveLabel: t('menu.status.inactive'),
    formOpen,
    onFormOpenChange: setFormOpen,
    formProps: {
      title: t('menu.tables.formTitle'),
      submitLabel: t('menu.actions.save'),
      cancelLabel: t('menu.actions.cancel'),
      labelFieldLabel: t('menu.tables.labelColumn'),
      form,
      onSubmit,
      isSubmitting: createState.isLoading,
    },
    onAdd: () => {
      setFormOpen(true);
    },
    onToggleActive,
    togglingTableId,
    rotateQrLabel: t('menu.tables.rotateQr'),
    rotatingTableId,
    onRotateQr: (tableId: string) => {
      void (async () => {
        if (branchId === null) {
          return;
        }
        setRotatingTableId(tableId);
        const result = await rotateQr({ branchId, tableId });
        setRotatingTableId(null);
        if (isMutationError(result)) {
          showMenuApiError(result.error, t);
        }
      })();
    },
  };
}
