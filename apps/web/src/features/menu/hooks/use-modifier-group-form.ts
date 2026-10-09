import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
      minSelect: z.number().int().min(0),
      maxSelect: z.number().int().min(1),
    })
    .refine((value) => value.minSelect <= value.maxSelect, {
      message: 'minSelect must be less than or equal to maxSelect',
      path: ['minSelect'],
    });
}

export type ModifierGroupFormValues = z.infer<ReturnType<typeof buildModifierGroupFormSchema>>;

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
      minSelect: groupForForm?.minSelect ?? 0,
      maxSelect: groupForForm?.maxSelect ?? 1,
    };
  }, [groupForForm, org.locales]);

  const form = useForm<ModifierGroupFormValues, unknown, ModifierGroupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesForReset(),
  });

  const entityKey = menuFormResetKey(options.editingId, groupForForm?.id);
  useMenuFormResetOnOpenOrEntity(form, options.open, entityKey, valuesForReset);

  const toCreateBody = (values: ModifierGroupFormValues) => ({
    name: localizedFormToApi(values.name, org),
    minSelect: values.minSelect,
    maxSelect: values.maxSelect,
  });

  const toPatchBody = (values: ModifierGroupFormValues) => ({
    name: localizedFormToApi(values.name, org),
    minSelect: values.minSelect,
    maxSelect: values.maxSelect,
  });

  return { form, org, toCreateBody, toPatchBody };
}
