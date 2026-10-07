import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Category } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan } from '../../session/session.selectors.js';
import { CategoriesPageView, CategoryRowView } from '../components/CategoriesPageView.js';
import { useCategoryDragReorder } from '../hooks/use-category-drag-reorder.js';
import { useCategoryForm, type CategoryFormValues } from '../hooks/use-category-form.js';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  usePatchCategoryMutation,
  useReorderCategoriesMutation,
} from '../menu.api.js';
import { categoryLabel } from '../menu.utils.js';

export function CategoriesScreen() {
  const { t } = useTranslation();
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

  const onReorder = useCallback(
    (orderedIds: string[]) => {
      void reorderCategories({ orderedIds });
    },
    [reorderCategories],
  );

  const dragReorder = useCategoryDragReorder(items, canManage, onReorder);

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
          if ('data' in result && result.data) {
            setFormOpen(false);
          }
        });
      } else if (editing) {
        void patchCategory({
          categoryId: editing.id,
          body: categoryForm.toPatchBody(values),
        }).then((result) => {
          if ('data' in result && result.data) {
            setFormOpen(false);
          }
        });
      }
    })();
  };

  const sortableRows = items.map((category) => (
    <CategoryRowView
      key={category.id}
      category={category}
      label={categoryLabel(category, org.uiLocale, org.defaultLocale)}
      canManage={canManage}
      dragLabel={t('menu.categories.drag')}
      editLabel={t('menu.actions.edit')}
      deleteLabel={t('menu.actions.delete')}
      activeLabel={t('menu.status.active')}
      inactiveLabel={t('menu.status.inactive')}
      dragHandleProps={dragReorder.getDragHandleProps(category.id)}
      rowProps={dragReorder.getRowProps(category.id)}
      isDragging={dragReorder.isDragging(category.id)}
      isDropTarget={dragReorder.isOver(category.id)}
      onEdit={() => {
        setFormMode('edit');
        setEditing(category);
        setFormOpen(true);
      }}
      onDelete={() => {
        setDeleting(category);
        setConfirmDeleteOpen(true);
      }}
    />
  ));

  return (
    <CategoriesPageView
      title={t('menu.categories.title')}
      subtitle={t('menu.categories.subtitle')}
      canManage={canManage}
      isLoading={isLoading}
      items={items}
      addLabel={t('menu.categories.add')}
      emptyTitle={t('menu.categories.emptyTitle')}
      emptyDescription={t('menu.categories.emptyDescription')}
      deleteLabel={t('menu.actions.delete')}
      formOpen={formOpen}
      onFormOpenChange={setFormOpen}
      formMode={formMode}
      formProps={{
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
      }}
      confirmDeleteOpen={confirmDeleteOpen}
      onConfirmDeleteOpenChange={setConfirmDeleteOpen}
      onConfirmDelete={() => {
        if (!deleting) {
          return;
        }
        void deleteCategory(deleting.id).then(() => {
          setConfirmDeleteOpen(false);
          setDeleting(undefined);
        });
      }}
      isDeleting={deleteState.isLoading}
      onAdd={() => {
        setFormMode('create');
        setEditing(undefined);
        setFormOpen(true);
      }}
      sortableRows={sortableRows}
    />
  );
}
