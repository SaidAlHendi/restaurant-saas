import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { ProductDetail } from '@app/shared';

import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';
import { useCatalogOrg } from './use-catalog-org.js';
import { menuFormResetKey, useMenuFormResetOnOpenOrEntity } from './use-menu-form-reset.js';

export function buildProductFormSchema(
  locales: string[],
  defaultLocale: string,
  categoryIds: string[],
  priceRequiredMessage: string,
) {
  const nameSchema = buildLocalizedFormSchema(locales, defaultLocale);
  const descriptionShape: Record<string, z.ZodString> = {};
  for (const locale of locales) {
    descriptionShape[locale] = z.string();
  }
  return z
    .object({
      categoryId: z.uuid(),
      name: nameSchema,
      description: z.object(descriptionShape),
      priceMinor: z
        .number()
        .int()
        .min(0)
        .nullable()
        .refine((value) => value !== null, { message: priceRequiredMessage }),
      isActive: z.boolean(),
      modifierGroupIds: z.array(z.uuid()),
    })
    .superRefine((data, ctx) => {
      if (categoryIds.length > 0 && !categoryIds.includes(data.categoryId)) {
        ctx.addIssue({ code: 'custom', message: 'invalid category', path: ['categoryId'] });
      }
    });
}

export type ProductFormValues = z.input<ReturnType<typeof buildProductFormSchema>>;
export type ProductFormOutput = z.output<ReturnType<typeof buildProductFormSchema>>;

export function buildProductFormDefaultValues(
  product: ProductDetail | undefined,
  categoryIds: string[],
  locales: string[],
): ProductFormValues {
  return {
    categoryId: product?.categoryId ?? categoryIds[0] ?? '',
    name: localizedRecordToFormDefaults(product?.name, locales),
    description: localizedRecordToFormDefaults(product?.description ?? undefined, locales),
    priceMinor: product === undefined ? null : product.priceMinor,
    isActive: product?.isActive ?? true,
    modifierGroupIds: product?.modifierGroups.map((group) => group.id) ?? [],
  };
}

export function useProductForm(options: {
  editingId: string | undefined;
  product: ProductDetail | undefined;
  categoryIds: string[];
  open: boolean;
}) {
  const org = useCatalogOrg();
  const { t } = useTranslation();

  const productForForm =
    options.editingId !== undefined && options.product?.id === options.editingId
      ? options.product
      : undefined;

  const schema = useMemo(
    () =>
      buildProductFormSchema(
        org.locales,
        org.defaultLocale,
        options.categoryIds,
        t('menu.products.priceRequired'),
      ),
    [org.defaultLocale, org.locales, options.categoryIds, t],
  );

  const valuesForReset = useCallback(
    (): ProductFormValues =>
      buildProductFormDefaultValues(productForForm, options.categoryIds, org.locales),
    [options.categoryIds, org.locales, productForForm],
  );

  const form = useForm<ProductFormValues, unknown, ProductFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: valuesForReset(),
  });

  const entityKey = menuFormResetKey(options.editingId, productForForm?.id);
  useMenuFormResetOnOpenOrEntity(form, options.open, entityKey, valuesForReset);

  const toCreateBody = (values: ProductFormOutput) => ({
    categoryId: values.categoryId,
    name: localizedFormToApi(values.name, org),
    description: localizedFormToApi(values.description, org, { optional: true }),
    priceMinor: values.priceMinor,
    isActive: values.isActive,
  });

  const toPatchBody = (values: ProductFormOutput) => ({
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
