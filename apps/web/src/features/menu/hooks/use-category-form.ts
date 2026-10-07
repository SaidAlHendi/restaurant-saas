import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Category } from '@app/shared';

import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';
import { useCatalogOrg } from './use-catalog-org.js';

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

  const defaultValues = useMemo((): CategoryFormValues => {
    return {
      name: localizedRecordToFormDefaults(options.category?.name, org.locales),
      isActive: options.category?.isActive ?? true,
    };
  }, [options.category, org.locales]);

  const form = useForm<CategoryFormValues, unknown, CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (options.open) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, options.open]);

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
