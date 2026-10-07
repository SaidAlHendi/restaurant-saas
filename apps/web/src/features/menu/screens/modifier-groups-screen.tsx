import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Modifier, ModifierGroup } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan } from '../../session/session.selectors.js';
import { ModifierFormDialogView } from '../components/ModifierFormDialogView.js';
import { ModifierGroupDetailSheetView } from '../components/ModifierGroupDetailSheetView.js';
import { ModifierGroupsPageView } from '../components/ModifierGroupsPageView.js';
import { useModifierForm, type ModifierFormValues } from '../hooks/use-modifier-form.js';
import {
  useModifierGroupForm,
  type ModifierGroupFormValues,
} from '../hooks/use-modifier-group-form.js';
import {
  useCreateModifierGroupMutation,
  useCreateModifierMutation,
  useDeleteModifierGroupMutation,
  useDeleteModifierMutation,
  useGetModifierGroupQuery,
  useListModifierGroupsQuery,
  usePatchModifierGroupMutation,
} from '../menu.api.js';
import { formatModifierPriceDelta, pickLocalizedName } from '../menu.utils.js';

export function ModifierGroupsScreen() {
  const { t, i18n } = useTranslation();
  const canManage = useAppSelector(selectCan('menu.manage'));
  const moneyLocale = i18n.language === 'ar' ? 'ar-SA' : 'en-SA';

  const { data, isLoading } = useListModifierGroupsQuery(undefined);
  const groups = data?.items ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<ModifierGroup | undefined>();
  const groupForm = useModifierGroupForm({ group: editing, open: formOpen });

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

  const [modifierFormOpen, setModifierFormOpen] = useState(false);
  const modifierForm = useModifierForm({ open: modifierFormOpen });
  const [createModifier, createModifierState] = useCreateModifierMutation();
  const [deleteModifier] = useDeleteModifierMutation();

  const org = groupForm.org;
  const localeLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of org.locales) {
      out[locale] = t(`auth.locales.${locale}`, { defaultValue: locale });
    }
    return out;
  }, [org.locales, t]);

  const labelFor = (group: ModifierGroup) =>
    pickLocalizedName(group.name, org.uiLocale, org.defaultLocale);

  const onSubmitGroupForm = () => {
    void groupForm.form.handleSubmit((values: ModifierGroupFormValues) => {
      if (formMode === 'create') {
        void createGroup(groupForm.toCreateBody(values)).then((result) => {
          if ('data' in result && result.data) {
            setFormOpen(false);
          }
        });
      } else if (editing) {
        void patchGroup({
          groupId: editing.id,
          body: groupForm.toPatchBody(values),
        }).then((result) => {
          if ('data' in result && result.data) {
            setFormOpen(false);
          }
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
        if ('data' in result && result.data) {
          setModifierFormOpen(false);
        }
      });
    })();
  };

  const onDeleteModifier = (modifier: Modifier) => {
    if (!selectedGroupId) {
      return;
    }
    void deleteModifier({ groupId: selectedGroupId, modifierId: modifier.id });
  };

  return (
    <>
      <ModifierGroupsPageView
        title={t('menu.modifierGroups.title')}
        subtitle={t('menu.modifierGroups.subtitle')}
        canManage={canManage}
        isLoading={isLoading}
        groups={groups}
        labelFor={labelFor}
        addLabel={t('menu.modifierGroups.add')}
        emptyTitle={t('menu.modifierGroups.emptyTitle')}
        emptyDescription={t('menu.modifierGroups.emptyDescription')}
        editLabel={t('menu.actions.edit')}
        deleteLabel={t('menu.actions.delete')}
        minMaxLabel={(group) =>
          t('menu.modifierGroups.minMax', { min: group.minSelect, max: group.maxSelect })
        }
        formOpen={formOpen}
        onFormOpenChange={setFormOpen}
        formMode={formMode}
        formProps={{
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
        }}
        confirmDeleteOpen={confirmDeleteOpen}
        onConfirmDeleteOpenChange={setConfirmDeleteOpen}
        onConfirmDelete={() => {
          if (!deleting) {
            return;
          }
          void deleteGroup(deleting.id).then(() => {
            setConfirmDeleteOpen(false);
            setDeleting(undefined);
          });
        }}
        isDeleting={deleteGroupState.isLoading}
        onAdd={() => {
          setFormMode('create');
          setEditing(undefined);
          setFormOpen(true);
        }}
        onEdit={(group) => {
          setFormMode('edit');
          setEditing(group);
          setFormOpen(true);
        }}
        onDelete={(group) => {
          setDeleting(group);
          setConfirmDeleteOpen(true);
        }}
        onOpen={(group) => {
          setSelectedGroupId(group.id);
          setDetailOpen(true);
        }}
        openLabel={t('menu.modifierGroups.manageModifiers')}
      />
      <ModifierGroupDetailSheetView
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={groupDetail ? labelFor(groupDetail) : t('menu.modifierGroups.detailTitle')}
        isLoading={detailLoading}
        group={groupDetail}
        modifierLabel={(modifier) =>
          pickLocalizedName(modifier.name, org.uiLocale, org.defaultLocale)
        }
        priceLabel={(modifier) => formatModifierPriceDelta(modifier, moneyLocale)}
        activeLabel={t('menu.status.active')}
        inactiveLabel={t('menu.status.inactive')}
        addModifierLabel={t('menu.modifiers.add')}
        deleteModifierLabel={t('menu.actions.delete')}
        canManage={canManage}
        onAddModifier={() => {
          setModifierFormOpen(true);
        }}
        onDeleteModifier={onDeleteModifier}
        emptyModifiersTitle={t('menu.modifiers.emptyTitle')}
      />
      <ModifierFormDialogView
        open={modifierFormOpen}
        onOpenChange={setModifierFormOpen}
        title={t('menu.modifiers.createTitle')}
        submitLabel={t('menu.actions.save')}
        cancelLabel={t('menu.actions.cancel')}
        priceLabel={t('menu.modifiers.fields.priceDelta')}
        activeLabel={t('menu.status.active')}
        currency={org.defaultCurrency}
        moneyLocale={moneyLocale}
        locales={org.locales}
        localeLabels={localeLabels}
        tabLabel={(locale) => t(`auth.locales.${locale}`, { defaultValue: locale })}
        defaultLocale={org.defaultLocale}
        form={modifierForm.form}
        onSubmit={onSubmitModifierForm}
        isSaving={createModifierState.isLoading}
      />
    </>
  );
}
