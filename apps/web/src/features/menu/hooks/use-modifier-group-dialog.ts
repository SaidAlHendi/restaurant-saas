import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ModifierGroup } from '@app/shared';

import type { ModifierGroupFormDialogViewProps } from '../components/ModifierGroupFormDialogView.js';
import {
  useCreateModifierGroupMutation,
  useCreateModifierMutation,
  usePatchModifierGroupMutation,
} from '../menu.api.js';
import { isMutationError } from '../menu-mutation-result.js';
import { showMenuApiError } from '../show-menu-api-error.js';
import {
  EMPTY_MODIFIER_ROW,
  minSelectFromForm,
  useModifierGroupForm,
  type ModifierGroupFormValues,
} from './use-modifier-group-form.js';

export interface ModifierGroupCreatedInfo {
  /** False when the group exists but at least one typed modifier could not be saved. */
  allModifiersSaved: boolean;
}

/**
 * Create / edit dialog for a modifier group. Shared by the Modifier groups page and the product
 * form ("+ New group"), so both create groups the same way (group first, then its modifiers).
 */
export function useModifierGroupDialog(options: {
  onCreated?: (group: ModifierGroup, info: ModifierGroupCreatedInfo) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<ModifierGroup | undefined>();
  const groupForm = useModifierGroupForm({ editingId: editing?.id, group: editing, open });
  const { org } = groupForm;

  const [createGroup, createGroupState] = useCreateModifierGroupMutation();
  const [patchGroup, patchGroupState] = usePatchModifierGroupMutation();
  const [createModifier, createModifierState] = useCreateModifierMutation();

  const localeLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of org.locales) {
      out[locale] = t(`auth.locales.${locale}`, { defaultValue: locale });
    }
    return out;
  }, [org.locales, t]);

  const summaryFor = (values: Pick<ModifierGroupFormValues, 'isRequired' | 'maxSelect'>) => {
    const max = Math.max(1, values.maxSelect || 1);
    const min = minSelectFromForm({ ...values, maxSelect: max }, editing?.minSelect);
    if (min >= 1) {
      return max === 1 && min === 1
        ? t('menu.modifierGroups.summary.requiredOne')
        : t('menu.modifierGroups.summary.requiredRange', { min, max });
    }
    return max === 1
      ? t('menu.modifierGroups.summary.optionalOne')
      : t('menu.modifierGroups.summary.optionalUpTo', { max });
  };

  const submit = () => {
    void groupForm.form.handleSubmit(async (values: ModifierGroupFormValues) => {
      if (mode === 'edit' && editing) {
        const result = await patchGroup({
          groupId: editing.id,
          body: groupForm.toGroupBody(values),
        });
        if (isMutationError(result)) {
          showMenuApiError(result.error, t);
          return;
        }
        setOpen(false);
        return;
      }
      const created = await createGroup(groupForm.toGroupBody(values));
      if (isMutationError(created)) {
        showMenuApiError(created.error, t);
        return;
      }
      let allModifiersSaved = true;
      for (const body of groupForm.toModifierBodies(values)) {
        const result = await createModifier({ groupId: created.data.id, body });
        if (isMutationError(result)) {
          showMenuApiError(result.error, t);
          allModifiersSaved = false;
          break;
        }
      }
      setOpen(false);
      options.onCreated?.(created.data, { allModifiersSaved });
    })();
  };

  const formProps: Omit<ModifierGroupFormDialogViewProps, 'open' | 'onOpenChange' | 'mode'> = {
    form: groupForm.form,
    modifierRows: groupForm.modifierRows,
    emptyModifierRow: { ...EMPTY_MODIFIER_ROW },
    onSubmit: submit,
    isSaving:
      createGroupState.isLoading || patchGroupState.isLoading || createModifierState.isLoading,
    titleCreate: t('menu.modifierGroups.createTitle'),
    titleEdit: t('menu.modifierGroups.editTitle'),
    submitLabel: t('menu.actions.save'),
    cancelLabel: t('menu.actions.cancel'),
    locales: org.locales,
    localeLabels,
    fieldLabels: { name: t('menu.fields.name'), description: t('menu.fields.description') },
    tabLabel: (locale) => t(`auth.locales.${locale}`, { defaultValue: locale }),
    defaultLocale: org.defaultLocale,
    currency: org.defaultCurrency,
    moneyLocale: org.uiLocale,
    decreaseLabel: t('menu.modifierGroups.decrease'),
    increaseLabel: t('menu.modifierGroups.increase'),
    requiredLabel: t('menu.modifierGroups.form.requiredLabel'),
    requiredHelp: t('menu.modifierGroups.form.requiredHelp'),
    maxLabel: t('menu.modifierGroups.form.maxLabel'),
    maxHelp: t('menu.modifierGroups.form.maxHelp'),
    summaryFor,
    modifiersTitle: t('menu.modifierGroups.form.modifiersTitle'),
    modifiersHelp: t('menu.modifierGroups.form.modifiersHelp'),
    modifierNameLabel: t('menu.modifierGroups.form.modifierName', {
      language: localeLabels[org.defaultLocale] ?? org.defaultLocale,
    }),
    modifierPriceLabel: t('menu.modifiers.fields.priceDelta'),
    addRowLabel: t('menu.modifierGroups.form.addRow'),
    removeRowLabel: t('menu.modifierGroups.form.removeRow'),
    modifiersLaterHint: t('menu.modifierGroups.form.modifiersLaterHint'),
    helpLabel: t('menu.help.whatIsThis'),
  };

  return {
    open,
    mode,
    onOpenChange: (next: boolean) => {
      setOpen(next);
      if (!next) {
        setEditing(undefined);
      }
    },
    openCreate: () => {
      setMode('create');
      setEditing(undefined);
      setOpen(true);
    },
    openEdit: (group: ModifierGroup) => {
      setMode('edit');
      setEditing(group);
      setOpen(true);
    },
    formProps,
  };
}
