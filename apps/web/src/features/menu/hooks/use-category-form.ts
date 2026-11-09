import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Category } from '@app/shared';

import {
  branchAvailabilityDefaults,
  branchAvailabilityToApi,
} from '../branch-availability.utils.js';
import {
  buildLocalizedFormSchema,
  localizedFormToApi,
  localizedRecordToFormDefaults,
} from '../menu.utils.js';
import { useBranchAvailabilityScope } from './use-branch-availability-scope.js';
import { useCatalogOrg } from './use-catalog-org.js';
import { menuFormResetKey, useMenuFormResetOnOpenOrEntity } from './use-menu-form-reset.js';

export function buildCategoryFormSchema(
  locales: string[],
  defaultLocale: string,
  branchRules: { requireBranchSelection: boolean; branchSelectionMessage: string } = {
    requireBranchSelection: false,
    branchSelectionMessage: '',
  },
) {
  return z
    .object({
      name: buildLocalizedFormSchema(locales, defaultLocale),
      isActive: z.boolean(),
      availableInAllBranches: z.boolean().default(true),
      branchIds: z.array(z.uuid()).default([]),
    })
    .superRefine((data, ctx) => {
      if (
        branchRules.requireBranchSelection &&
        !data.availableInAllBranches &&
        data.branchIds.length === 0
      ) {
        ctx.addIssue({
          code: 'custom',
          message: branchRules.branchSelectionMessage,
          path: ['branchIds'],
        });
      }
    });
}

export type CategoryFormValues = z.input<ReturnType<typeof buildCategoryFormSchema>>;
export type CategoryFormOutput = z.output<ReturnType<typeof buildCategoryFormSchema>>;

export function useCategoryForm(options: {
  editingId: string | undefined;
  category: Category | undefined;
  open: boolean;
}) {
  const org = useCatalogOrg();
  const { t } = useTranslation();
  const branchScope = useBranchAvailabilityScope();
  const schema = useMemo(
    () =>
      buildCategoryFormSchema(org.locales, org.defaultLocale, {
        // Staff limited to some branches may untick all of theirs when editing (other branches stay).
        requireBranchSelection: options.editingId === undefined || branchScope.allBranchesScope,
        branchSelectionMessage: t('menu.availability.pickOne'),
      }),
    [org.defaultLocale, org.locales, options.editingId, branchScope.allBranchesScope, t],
  );

  const categoryForForm =
    options.editingId !== undefined && options.category?.id === options.editingId
      ? options.category
      : undefined;

  const valuesForReset = useCallback((): CategoryFormValues => {
    return {
      name: localizedRecordToFormDefaults(categoryForForm?.name, org.locales),
      isActive: categoryForForm?.isActive ?? true,
      ...branchAvailabilityDefaults(categoryForForm, branchScope),
    };
  }, [branchScope, categoryForForm, org.locales]);

  const form = useForm<CategoryFormValues, unknown, CategoryFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: valuesForReset(),
  });

  const entityKey = menuFormResetKey(options.editingId, categoryForForm?.id);
  useMenuFormResetOnOpenOrEntity(form, options.open, entityKey, valuesForReset);

  const toCreateBody = (values: CategoryFormOutput) => ({
    name: localizedFormToApi(values.name, org),
    isActive: values.isActive,
    ...branchAvailabilityToApi(values, branchScope),
  });

  const toPatchBody = (values: CategoryFormOutput) => ({
    name: localizedFormToApi(values.name, org),
    isActive: values.isActive,
    ...branchAvailabilityToApi(values, branchScope),
  });

  return { form, org, branchScope, toCreateBody, toPatchBody };
}
