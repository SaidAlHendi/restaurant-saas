import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Category } from '@app/shared';

import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';
import { useCatalogOrg } from './use-catalog-org.js';
import { useMenuFormResetOnOpenOrEntity } from './use-menu-form-reset.js';

export function buildCategoryFormSchema(locales: string[], defaultLocale: string) {
  return z.object({
    name: buildLocalizedFormSchema(locales, defaultLocale),
    isActive: z.boolean(),
  });
}

export type CategoryFormValues = z.infer<ReturnType<typeof buildCategoryFormSchema>>;

export function useCategoryForm(options: {
  category: Category | undefined;
  open: boolean;
}) {
  const org = useCatalogOrg();
  const schema = useMemo(
    () => buildCategoryFormSchema(org.locales, org.defaultLocale),
    [org.defaultLocale, org.locales],
  );

  const valuesForReset = useCallback((): CategoryFormValues => {
    return {
      name: localizedRecordToFormDefaults(options.category?.name, org.locales),
      isActive: options.category?.isActive ?? true,
    };
  }, [options.category, org.locales]);

  const form = useForm<CategoryFormValues, unknown, CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesForReset(),
  });

  const entityKey = options.category?.id ?? 'new';
  useMenuFormResetOnOpenOrEntity(form, options.open, entityKey, valuesForReset);

  const toCreateBody = (values: CategoryFormValues) => ({
    name: localizedFormToApi(values.name, org),
    isActive: values.isActive,
  });

  const toPatchBody = (values: CategoryFormValues) => ({
    name: localizedFormToApi(values.name, org),
    isActive: values.isActive,
  });

  return { form, org, toCreateBody, toPatchBody };
}
