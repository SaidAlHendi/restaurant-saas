import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { ProductDetail } from '@app/shared';

import { useCatalogOrg } from './use-catalog-org.js';
import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';

export function buildProductFormSchema(
  locales: string[],
  defaultLocale: string,
  categoryIds: string[],
) {
  const nameSchema = buildLocalizedFormSchema(locales, defaultLocale);
  const descriptionShape: Record<string, z.ZodString> = {};
  for (const locale of locales) {
    descriptionShape[locale] = z.string();
  }
  return z.object({
    categoryId: z.uuid(),
    name: nameSchema,
    description: z.object(descriptionShape),
    priceMinor: z.number().int().min(0),
    isActive: z.boolean(),
    modifierGroupIds: z.array(z.uuid()),
  }).superRefine((data, ctx) => {
    if (categoryIds.length > 0 && !categoryIds.includes(data.categoryId)) {
      ctx.addIssue({ code: 'custom', message: 'invalid category', path: ['categoryId'] });
    }
  });
}

export type ProductFormValues = z.infer<ReturnType<typeof buildProductFormSchema>>;

export function useProductForm(options: {
  product: ProductDetail | undefined;
  categoryIds: string[];
  open: boolean;
}) {
  const org = useCatalogOrg();

  const schema = useMemo(
    () => buildProductFormSchema(org.locales, org.defaultLocale, options.categoryIds),
    [org.defaultLocale, org.locales, options.categoryIds],
  );

  const defaultValues = useMemo((): ProductFormValues => {
    const product = options.product;
    return {
      categoryId: product?.categoryId ?? options.categoryIds[0] ?? '',
      name: localizedRecordToFormDefaults(product?.name, org.locales),
      description: localizedRecordToFormDefaults(product?.description ?? undefined, org.locales),
      priceMinor: product?.priceMinor ?? 0,
      isActive: product?.isActive ?? true,
      modifierGroupIds: product?.modifierGroups.map((group) => group.id) ?? [],
    };
  }, [options.categoryIds, options.product, org.locales]);

  const form = useForm<ProductFormValues, unknown, ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (options.open) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, options.open]);

  const toCreateBody = (values: ProductFormValues) => ({
    categoryId: values.categoryId,
    name: localizedFormToApi(values.name, org),
    description: localizedFormToApi(values.description, org, { optional: true }),
    priceMinor: values.priceMinor,
    isActive: values.isActive,
  });

  const toPatchBody = (values: ProductFormValues) => ({
    categoryId: values.categoryId,
    name: localizedFormToApi(values.name, org),
    description: localizedFormToApi(values.description, org, { optional: true }),
    priceMinor: values.priceMinor,
    isActive: values.isActive,
  });

  return {
    form,
    org,
    toCreateBody,
    toPatchBody,
    modifierGroupIds: form.watch('modifierGroupIds'),
  };
}
