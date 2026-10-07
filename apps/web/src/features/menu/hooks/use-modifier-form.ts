import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';
import { useCatalogOrg } from './use-catalog-org.js';

export function buildModifierFormSchema(locales: string[], defaultLocale: string) {
  return z.object({
    name: buildLocalizedFormSchema(locales, defaultLocale),
    priceDeltaMinor: z.number().int(),
    isActive: z.boolean(),
  });
}

export type ModifierFormValues = z.infer<ReturnType<typeof buildModifierFormSchema>>;

export function useModifierForm(options: { open: boolean }) {
  const org = useCatalogOrg();
  const schema = useMemo(
    () => buildModifierFormSchema(org.locales, org.defaultLocale),
    [org.defaultLocale, org.locales],
  );

  const defaultValues = useMemo((): ModifierFormValues => {
    return {
      name: localizedRecordToFormDefaults(undefined, org.locales),
      priceDeltaMinor: 0,
      isActive: true,
    };
  }, [org.locales]);

  const form = useForm<ModifierFormValues, unknown, ModifierFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (options.open) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, options.open]);

  const toCreateBody = (values: ModifierFormValues) => ({
    name: localizedFormToApi(values.name, org),
    priceDeltaMinor: values.priceDeltaMinor,
    isActive: values.isActive,
  });

  return { form, org, toCreateBody };
}
