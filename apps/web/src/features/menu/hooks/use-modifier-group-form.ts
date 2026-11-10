import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import type { ModifierGroup } from '@app/shared';

import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';
import { useCatalogOrg } from './use-catalog-org.js';
import { menuFormResetKey, useMenuFormResetOnOpenOrEntity } from './use-menu-form-reset.js';

export function buildModifierGroupFormSchema(locales: string[], defaultLocale: string) {
  return z
    .object({
      name: buildLocalizedFormSchema(locales, defaultLocale),
      /** "Customer must choose" — maps to minSelect >= 1. */
      isRequired: z.boolean(),
      /** "Choose up to" — maps to maxSelect. */
      maxSelect: z.number().int().min(1),
      /**
       * Choices typed while creating the group. Name is in the organization's default language;
       * other languages can be added later under "Manage modifiers". Fully blank rows are ignored.
       */
      modifiers: z.array(
        z.object({
          name: z.string(),
          priceDeltaMinor: z.number().int(),
        }),
      ),
    })
    .superRefine((values, ctx) => {
      values.modifiers.forEach((row, index) => {
        if (row.name.trim().length === 0 && row.priceDeltaMinor !== 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'Modifier name is required',
            path: ['modifiers', index, 'name'],
          });
        }
      });
    });
}

export type ModifierGroupFormValues = z.infer<ReturnType<typeof buildModifierGroupFormSchema>>;

export const EMPTY_MODIFIER_ROW = { name: '', priceDeltaMinor: 0 } as const;

/** A row counts when it has a name; a price without a name is flagged by the form. */
export function isUsableModifierRow(row: { name: string }): boolean {
  return row.name.trim().length > 0;
}

/** Required → at least 1 (keeps an existing higher minimum); optional → 0. Never above max. */
export function minSelectFromForm(
  values: Pick<ModifierGroupFormValues, 'isRequired' | 'maxSelect'>,
  existingMin: number | undefined,
): number {
  if (!values.isRequired) {
    return 0;
  }
  return Math.min(Math.max(existingMin ?? 1, 1), values.maxSelect);
}

export function useModifierGroupForm(options: {
  editingId: string | undefined;
  group: ModifierGroup | undefined;
  open: boolean;
}) {
  const org = useCatalogOrg();
  const schema = useMemo(
    () => buildModifierGroupFormSchema(org.locales, org.defaultLocale),
    [org.defaultLocale, org.locales],
  );

  const groupForForm =
    options.editingId !== undefined && options.group?.id === options.editingId
      ? options.group
      : undefined;

  const valuesForReset = useCallback((): ModifierGroupFormValues => {
    return {
      name: localizedRecordToFormDefaults(groupForForm?.name, org.locales),
      isRequired: (groupForForm?.minSelect ?? 0) >= 1,
      maxSelect: groupForForm?.maxSelect ?? 1,
      modifiers: groupForForm ? [] : [{ ...EMPTY_MODIFIER_ROW }],
    };
  }, [groupForForm, org.locales]);

  const form = useForm<ModifierGroupFormValues, unknown, ModifierGroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesForReset(),
  });

  const modifierRows = useFieldArray({ control: form.control, name: 'modifiers' });

  const entityKey = menuFormResetKey(options.editingId, groupForForm?.id);
  useMenuFormResetOnOpenOrEntity(form, options.open, entityKey, valuesForReset);

  const toGroupBody = (values: ModifierGroupFormValues) => ({
    name: localizedFormToApi(values.name, org),
    minSelect: minSelectFromForm(values, groupForForm?.minSelect),
    maxSelect: values.maxSelect,
  });

  /** Bodies for the modifiers typed in the dialog (blank rows dropped). */
  const toModifierBodies = (values: ModifierGroupFormValues) =>
    values.modifiers.filter(isUsableModifierRow).map((row) => ({
      name: localizedFormToApi({ [org.defaultLocale]: row.name.trim() }, org),
      priceDeltaMinor: row.priceDeltaMinor,
    }));

  return { form, org, modifierRows, toGroupBody, toModifierBodies };
}
