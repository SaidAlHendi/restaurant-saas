import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';
import { useCatalogOrg } from './use-catalog-org.js';
import { useMenuFormResetOnOpenOrEntity } from './use-menu-form-reset.js';

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

  const valuesForReset = useCallback((): ModifierFormValues => {
    return {
      name: localizedRecordToFormDefaults(undefined, org.locales),
      priceDeltaMinor: 0,
      isActive: true,
    };
  }, [org.locales]);

  const form = useForm<ModifierFormValues, unknown, ModifierFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesForReset(),
  });

  useMenuFormResetOnOpenOrEntity(form, options.open, 'new', valuesForReset);

  const toCreateBody = (values: ModifierFormValues) => ({
    name: localizedFormToApi(values.name, org),
    priceDeltaMinor: values.priceDeltaMinor,
    isActive: values.isActive,
  });

  return { form, org, toCreateBody };
}
