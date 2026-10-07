import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Category } from '@app/shared';

import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { selectCan } from '../../session/session.selectors.js';
import type { CategoriesPageViewProps } from '../components/CategoriesPageView.js';
import type { CategorySortableListProps } from '../sortable/category-sortable-list.types.js';
import {
  menuApi,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  usePatchCategoryMutation,
  useReorderCategoriesMutation,
} from '../menu.api.js';
import { categoryLabel } from '../menu.utils.js';
import { isMutationError } from '../menu-mutation-result.js';
import { showMenuApiError } from '../show-menu-api-error.js';
import { useCategoryForm, type CategoryFormValues } from './use-category-form.js';
import { useOptimisticReorder } from './use-optimistic-reorder.js';

export function useCategoriesScreen(): {
  pageViewProps: Omit<CategoriesPageViewProps, 'sortableRows'>;
  sortableListProps: CategorySortableListProps;
} {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const canManage = useAppSelector(selectCan('menu.manage'));
  const { data, isLoading } = useListCategoriesQuery(undefined);
  const items = data?.items ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Category | undefined>();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | undefined>();

  const categoryForm = useCategoryForm({ category: editing, open: formOpen });
  const [createCategory, createState] = useCreateCategoryMutation();
  const [patchCategory, patchState] = usePatchCategoryMutation();
  const [deleteCategory, deleteState] = useDeleteCategoryMutation();
  const [reorderCategories] = useReorderCategoriesMutation();

  const applyOptimistic = useCallback(
    (nextItems: Category[]) => {
      dispatch(
        menuApi.util.updateQueryData('listCategories', undefined, (draft) => {
          draft.items = nextItems;
        }),
      );
    },
    [dispatch],
  );

  const commitReorder = useCallback(
    async (orderedIds: string[]) => {
      const result = await reorderCategories({ orderedIds });
      if (isMutationError(result)) {
        showMenuApiError(result.error, t);
        return { error: result.error };
      }
      return {};
    },
    [reorderCategories, t],
  );

  const { sensors, onDragEnd } = useOptimisticReorder({
    items,
    canManage,
    commit: commitReorder,
    applyOptimistic,
  });

  const org = categoryForm.org;
  const localeLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of org.locales) {
      out[locale] = t(`auth.locales.${locale}`, { defaultValue: locale });
    }
    return out;
  }, [org.locales, t]);

  const onSubmitForm = () => {
    void categoryForm.form.handleSubmit((values: CategoryFormValues) => {
      if (formMode === 'create') {
        void createCategory(categoryForm.toCreateBody(values)).then((result) => {
          if (isMutationError(result)) {
            showMenuApiError(result.error, t);
            return;
          }
          setFormOpen(false);
        });
      } else if (editing) {
        void patchCategory({
          categoryId: editing.id,
          body: categoryForm.toPatchBody(values),
        }).then((result) => {
          if (isMutationError(result)) {
            showMenuApiError(result.error, t);
            return;
          }
          setFormOpen(false);
        });
      }
    })();
  };

  const onConfirmDelete = () => {
    if (!deleting) {
      return;
    }
    void deleteCategory(deleting.id).then((result) => {
      if (isMutationError(result)) {
        showMenuApiError(result.error, t);
        return;
      }
      setConfirmDeleteOpen(false);
      setDeleting(undefined);
    });
  };

  const pageViewProps: Omit<CategoriesPageViewProps, 'sortableRows'> = {
    title: t('menu.categories.title'),
    subtitle: t('menu.categories.subtitle'),
    canManage,
    isLoading,
    items,
    addLabel: t('menu.categories.add'),
    emptyTitle: t('menu.categories.emptyTitle'),
    emptyDescription: t('menu.categories.emptyDescription'),
    deleteLabel: t('menu.actions.delete'),
    formOpen,
    onFormOpenChange: setFormOpen,
    formMode,
    formProps: {
      form: categoryForm.form,
      onSubmit: onSubmitForm,
      isSaving: createState.isLoading || patchState.isLoading,
      titleCreate: t('menu.categories.createTitle'),
      titleEdit: t('menu.categories.editTitle'),
      submitLabel: t('menu.actions.save'),
      cancelLabel: t('menu.actions.cancel'),
      deleteHint: t('menu.categories.deleteConfirm'),
      activeLabel: t('menu.status.active'),
      locales: org.locales,
      localeLabels,
      tabLabel: (locale) => t(`auth.locales.${locale}`, { defaultValue: locale }),
      defaultLocale: org.defaultLocale,
    },
    confirmDeleteOpen,
    onConfirmDeleteOpenChange: setConfirmDeleteOpen,
    onConfirmDelete,
    isDeleting: deleteState.isLoading,
    onAdd: () => {
      setFormMode('create');
      setEditing(undefined);
      setFormOpen(true);
    },
  };

  const sortableListProps: CategorySortableListProps = {
    items,
    canManage,
    sensors,
    onDragEnd,
    labelFor: (category) => categoryLabel(category, org.uiLocale, org.defaultLocale),
    dragLabel: t('menu.categories.drag'),
    editLabel: t('menu.actions.edit'),
    deleteLabel: t('menu.actions.delete'),
    activeLabel: t('menu.status.active'),
    inactiveLabel: t('menu.status.inactive'),
    onEdit: (category) => {
      setFormMode('edit');
      setEditing(category);
      setFormOpen(true);
    },
    onDelete: (category) => {
      setDeleting(category);
      setConfirmDeleteOpen(true);
    },
  };

  return { pageViewProps, sortableListProps };
}
