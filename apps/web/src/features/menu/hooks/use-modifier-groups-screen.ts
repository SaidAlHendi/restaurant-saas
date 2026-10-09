import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Modifier, ModifierGroup } from '@app/shared';

import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { formatMoney, intlLocaleForUi } from '../../../lib/money.js';
import { selectCan } from '../../session/session.selectors.js';
import type { ModifierFormDialogViewProps } from '../components/ModifierFormDialogView.js';
import type { ModifierGroupDetailSheetViewProps } from '../components/ModifierGroupDetailSheetView.js';
import type { ModifierGroupsPageViewProps } from '../components/ModifierGroupsPageView.js';
import { menuApi } from '../menu.api.js';
import { pickLocalizedName } from '../menu.utils.js';
import { isMutationError } from '../menu-mutation-result.js';
import { showMenuApiError } from '../show-menu-api-error.js';
import type { ModifierSortableListProps } from '../sortable/modifier-sortable-list.types.js';
import { useModifierForm, type ModifierFormValues } from './use-modifier-form.js';
import {
  useModifierGroupForm,
  type ModifierGroupFormValues,
} from './use-modifier-group-form.js';
import { useOptimisticReorder } from './use-optimistic-reorder.js';
import {
  useCreateModifierGroupMutation,
  useCreateModifierMutation,
  useDeleteModifierGroupMutation,
  useDeleteModifierMutation,
  useGetModifierGroupQuery,
  useListModifierGroupsQuery,
  usePatchModifierGroupMutation,
  useReorderModifiersMutation,
} from '../menu.api.js';

export function useModifierGroupsScreen(): {
  pageViewProps: ModifierGroupsPageViewProps;
  detailSheetProps: Omit<ModifierGroupDetailSheetViewProps, 'modifierList'>;
  modifierListProps: ModifierSortableListProps | null;
  modifierFormProps: ModifierFormDialogViewProps;
} {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const canManage = useAppSelector(selectCan('menu.manage'));

  const { data, isLoading } = useListModifierGroupsQuery(undefined);
  const groups = data?.items ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<ModifierGroup | undefined>();
  const groupForm = useModifierGroupForm({
    editingId: editing?.id,
    group: editing,
    open: formOpen,
  });

  const [createGroup, createGroupState] = useCreateModifierGroupMutation();
  const [patchGroup, patchGroupState] = usePatchModifierGroupMutation();
  const [deleteGroup, deleteGroupState] = useDeleteModifierGroupMutation();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<ModifierGroup | undefined>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const { data: groupDetail, isLoading: detailLoading } = useGetModifierGroupQuery(
    selectedGroupId ?? '',
    { skip: !selectedGroupId },
  );

  const modifiers = groupDetail?.modifiers ?? [];

  const [modifierFormOpen, setModifierFormOpen] = useState(false);
  const modifierForm = useModifierForm({ open: modifierFormOpen });
  const [createModifier, createModifierState] = useCreateModifierMutation();
  const [deleteModifier] = useDeleteModifierMutation();
  const [reorderModifiers] = useReorderModifiersMutation();

  const org = groupForm.org;
  const moneyLocale = intlLocaleForUi(org.uiLocale);

  const applyModifierOptimistic = useCallback(
    (nextModifiers: Modifier[]) => {
      if (!selectedGroupId) {
        return;
      }
      dispatch(
        menuApi.util.updateQueryData('getModifierGroup', selectedGroupId, (draft) => {
          draft.modifiers = nextModifiers;
        }),
      );
    },
    [dispatch, selectedGroupId],
  );

  const commitModifierReorder = useCallback(
    async (orderedIds: string[]) => {
      if (!selectedGroupId) {
        return { error: 'missing group' };
      }
      const result = await reorderModifiers({
        groupId: selectedGroupId,
        body: { orderedIds },
      });
      if (isMutationError(result)) {
        showMenuApiError(result.error, t);
        return { error: result.error };
      }
      return {};
    },
    [reorderModifiers, selectedGroupId, t],
  );

  const { sensors, onDragEnd } = useOptimisticReorder({
    items: modifiers,
    canManage,
    commit: commitModifierReorder,
    applyOptimistic: applyModifierOptimistic,
  });

  const localeLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of org.locales) {
      out[locale] = t(`auth.locales.${locale}`, { defaultValue: locale });
    }
    return out;
  }, [org.locales, t]);

  const labelFor = (group: ModifierGroup) =>
    pickLocalizedName(group.name, org.uiLocale, org.defaultLocale);

  const modifierPriceLabel = (modifier: Modifier) => {
    const formatted = formatMoney(modifier.priceDeltaMinor, modifier.currency, org.uiLocale);
    if (modifier.priceDeltaMinor === 0) {
      return formatted;
    }
    return modifier.priceDeltaMinor > 0 ? `+${formatted}` : formatted;
  };

  const onSubmitGroupForm = () => {
    void groupForm.form.handleSubmit((values: ModifierGroupFormValues) => {
      if (formMode === 'create') {
        void createGroup(groupForm.toCreateBody(values)).then((result) => {
          if (isMutationError(result)) {
            showMenuApiError(result.error, t);
            return;
          }
          setFormOpen(false);
        });
      } else if (editing) {
        void patchGroup({
          groupId: editing.id,
          body: groupForm.toPatchBody(values),
        }).then((result) => {
          if (isMutationError(result)) {
            showMenuApiError(result.error, t);
            return;
          }
          setFormOpen(false);
        });
      }
    })();
  };

  const onSubmitModifierForm = () => {
    if (!selectedGroupId) {
      return;
    }
    void modifierForm.form.handleSubmit((values: ModifierFormValues) => {
      void createModifier({
        groupId: selectedGroupId,
        body: modifierForm.toCreateBody(values),
      }).then((result) => {
        if (isMutationError(result)) {
          showMenuApiError(result.error, t);
          return;
        }
        setModifierFormOpen(false);
      });
    })();
  };

  const onDeleteModifier = (modifier: Modifier) => {
    if (!selectedGroupId) {
      return;
    }
    void deleteModifier({ groupId: selectedGroupId, modifierId: modifier.id }).then((result) => {
      if (isMutationError(result)) {
        showMenuApiError(result.error, t);
      }
    });
  };

  const pageViewProps: ModifierGroupsPageViewProps = {
    title: t('menu.modifierGroups.title'),
    subtitle: t('menu.modifierGroups.subtitle'),
    canManage,
    isLoading,
    groups,
    labelFor,
    addLabel: t('menu.modifierGroups.add'),
    emptyTitle: t('menu.modifierGroups.emptyTitle'),
    emptyDescription: t('menu.modifierGroups.emptyDescription'),
    editLabel: t('menu.actions.edit'),
    deleteLabel: t('menu.actions.delete'),
    minMaxLabel: (group) =>
      t('menu.modifierGroups.minMax', { min: group.minSelect, max: group.maxSelect }),
    formOpen,
    onFormOpenChange: (open) => {
      setFormOpen(open);
      if (!open) {
        setEditing(undefined);
      }
    },
    formMode,
    formProps: {
      form: groupForm.form,
      onSubmit: onSubmitGroupForm,
      isSaving: createGroupState.isLoading || patchGroupState.isLoading,
      titleCreate: t('menu.modifierGroups.createTitle'),
      titleEdit: t('menu.modifierGroups.editTitle'),
      submitLabel: t('menu.actions.save'),
      cancelLabel: t('menu.actions.cancel'),
      deleteHint: t('menu.modifierGroups.deleteConfirm'),
      minLabel: t('menu.modifierGroups.fields.minSelect'),
      maxLabel: t('menu.modifierGroups.fields.maxSelect'),
      decreaseLabel: t('menu.modifierGroups.decrease'),
      increaseLabel: t('menu.modifierGroups.increase'),
      locales: org.locales,
      localeLabels,
      tabLabel: (locale) => t(`auth.locales.${locale}`, { defaultValue: locale }),
      defaultLocale: org.defaultLocale,
    },
    confirmDeleteOpen,
    onConfirmDeleteOpenChange: setConfirmDeleteOpen,
    onConfirmDelete: () => {
      if (!deleting) {
        return;
      }
      void deleteGroup(deleting.id).then((result) => {
        if (isMutationError(result)) {
          showMenuApiError(result.error, t);
          return;
        }
        setConfirmDeleteOpen(false);
        setDeleting(undefined);
      });
    },
    isDeleting: deleteGroupState.isLoading,
    onAdd: () => {
      setFormMode('create');
      setEditing(undefined);
      setFormOpen(true);
    },
    onEdit: (group) => {
      setFormMode('edit');
      setEditing(group);
      setFormOpen(true);
    },
    onDelete: (group) => {
      setDeleting(group);
      setConfirmDeleteOpen(true);
    },
    onOpen: (group) => {
      setSelectedGroupId(group.id);
      setDetailOpen(true);
    },
    openLabel: t('menu.modifierGroups.manageModifiers'),
  };

  const detailSheetProps: Omit<ModifierGroupDetailSheetViewProps, 'modifierList'> = {
    open: detailOpen,
    onOpenChange: setDetailOpen,
    title: groupDetail ? labelFor(groupDetail) : t('menu.modifierGroups.detailTitle'),
    isLoading: detailLoading,
    group: groupDetail,
    addModifierLabel: t('menu.modifiers.add'),
    canManage,
    onAddModifier: () => {
      setModifierFormOpen(true);
    },
    emptyModifiersTitle: t('menu.modifiers.emptyTitle'),
  };

  const modifierListProps: ModifierSortableListProps | null =
    groupDetail && groupDetail.modifiers.length > 0
      ? {
          modifiers: groupDetail.modifiers,
          canManage,
          sensors,
          onDragEnd,
          modifierLabel: (modifier) =>
            pickLocalizedName(modifier.name, org.uiLocale, org.defaultLocale),
          priceLabel: modifierPriceLabel,
          activeLabel: t('menu.status.active'),
          inactiveLabel: t('menu.status.inactive'),
          dragLabel: t('menu.modifiers.drag'),
          deleteModifierLabel: t('menu.actions.delete'),
          onDeleteModifier,
        }
      : null;

  const modifierFormProps: ModifierFormDialogViewProps = {
    open: modifierFormOpen,
    onOpenChange: setModifierFormOpen,
    title: t('menu.modifiers.createTitle'),
    submitLabel: t('menu.actions.save'),
    cancelLabel: t('menu.actions.cancel'),
    priceLabel: t('menu.modifiers.fields.priceDelta'),
    activeLabel: t('menu.status.active'),
    currency: org.defaultCurrency,
    moneyLocale,
    locales: org.locales,
    localeLabels,
    tabLabel: (locale) => t(`auth.locales.${locale}`, { defaultValue: locale }),
    defaultLocale: org.defaultLocale,
    form: modifierForm.form,
    onSubmit: onSubmitModifierForm,
    isSaving: createModifierState.isLoading,
  };

  return { pageViewProps, detailSheetProps, modifierListProps, modifierFormProps };
}
