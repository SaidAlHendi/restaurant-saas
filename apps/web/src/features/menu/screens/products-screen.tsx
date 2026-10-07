import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Product, ProductListQuery } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan } from '../../session/session.selectors.js';
import { ProductsPageView } from '../components/ProductsPageView.js';
import { useCatalogOrg } from '../hooks/use-catalog-org.js';
import { useProductForm, type ProductFormValues } from '../hooks/use-product-form.js';
import { useProductImageUpload } from '../hooks/use-product-image-upload.js';
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductQuery,
  useListCategoriesQuery,
  useListModifierGroupsQuery,
  useListProductsQuery,
  usePatchProductMutation,
  useSetProductModifierGroupsMutation,
} from '../menu.api.js';
import { categoryLabel, pickLocalizedName, productLabel } from '../menu.utils.js';

export function ProductsScreen() {
  const { t, i18n } = useTranslation();
  const canManage = useAppSelector(selectCan('menu.manage'));
  const org = useCatalogOrg();
  const moneyLocale = i18n.language === 'ar' ? 'ar-SA' : 'en-SA';

  const { data: categoriesData } = useListCategoriesQuery(undefined);
  const categories = useMemo(() => categoriesData?.items ?? [], [categoriesData]);
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        label: categoryLabel(category, org.uiLocale, org.defaultLocale),
      })),
    [categories, org.defaultLocale, org.uiLocale],
  );
  const categoryIds = categoryOptions.map((item) => item.id);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<Product[]>([]);

  const listArgs = useMemo((): ProductListQuery => {
    const args: ProductListQuery = {
      limit: 20,
      cursor,
      isActive: undefined,
    };
    if (categoryFilter !== 'all') {
      args.categoryId = categoryFilter;
    }
    if (debouncedSearch.length > 0) {
      args.search = debouncedSearch;
    }
    return args;
  }, [categoryFilter, cursor, debouncedSearch]);

  const { data, isLoading, isFetching, error } = useListProductsQuery(listArgs);
  const { data: modifierGroupsData } = useListModifierGroupsQuery(undefined);
  const modifierGroups = modifierGroupsData?.items ?? [];

  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, [categoryFilter, debouncedSearch]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (!cursor) {
      setAccumulated(data.items);
    } else {
      setAccumulated((prev) => {
        const ids = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const item of data.items) {
          if (!ids.has(item.id)) {
            merged.push(item);
          }
        }
        return merged;
      });
    }
  }, [cursor, data]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const { data: productDetail } = useGetProductQuery(editingId ?? '', { skip: !editingId });

  const productForm = useProductForm({
    product: productDetail,
    categoryIds,
    open: sheetOpen,
  });

  const imageUpload = useProductImageUpload(productDetail);
  const [createProduct, createState] = useCreateProductMutation();
  const [patchProduct, patchState] = usePatchProductMutation();
  const [setModifierGroups] = useSetProductModifierGroupsMutation();
  const [deleteProduct, deleteState] = useDeleteProductMutation();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | undefined>();

  const localeLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of org.locales) {
      out[locale] = t(`auth.locales.${locale}`, { defaultValue: locale });
    }
    return out;
  }, [org.locales, t]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, categoryLabel(category, org.uiLocale, org.defaultLocale));
    }
    return map;
  }, [categories, org.defaultLocale, org.uiLocale]);

  const onSubmit = () => {
    void productForm.form.handleSubmit(async (values: ProductFormValues) => {
      if (editingId && productDetail) {
        await patchProduct({
          productId: editingId,
          body: productForm.toPatchBody(values),
        }).unwrap();
        await setModifierGroups({
          productId: editingId,
          body: { groupIds: values.modifierGroupIds },
        }).unwrap();
        setSheetOpen(false);
      } else {
        const created = await createProduct(productForm.toCreateBody(values)).unwrap();
        if (values.modifierGroupIds.length > 0) {
          await setModifierGroups({
            productId: created.id,
            body: { groupIds: values.modifierGroupIds },
          }).unwrap();
        }
        setEditingId(created.id);
      }
    })();
  };

  const imageError =
    imageUpload.localError === 'upload'
      ? t('menu.products.imageUploadError')
      : imageUpload.localError === 'remove'
        ? t('menu.products.imageRemoveError')
        : null;

  return (
    <ProductsPageView
      title={t('menu.products.title')}
      subtitle={t('menu.products.subtitle')}
      canManage={canManage}
      showAdd={canManage && categoryOptions.length > 0}
      searchDefault=""
      onSearchChange={setDebouncedSearch}
      searchClearLabel={t('menu.products.searchClear')}
      searchPlaceholder={t('menu.products.searchPlaceholder')}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={setCategoryFilter}
      allCategoriesLabel={t('menu.products.allCategories')}
      categories={categoryOptions}
      products={accumulated}
      isLoading={isLoading && accumulated.length === 0}
      errorMessage={error ? t('menu.errors.loadFailed') : null}
      labelFor={(product) => productLabel(product, org.uiLocale, org.defaultLocale)}
      categoryLabelFor={(product) => categoryNameById.get(product.categoryId) ?? '—'}
      currency={org.defaultCurrency}
      locale={moneyLocale}
      activeLabel={t('menu.status.active')}
      inactiveLabel={t('menu.status.inactive')}
      priceColumn={t('menu.products.columns.price')}
      nameColumn={t('menu.products.columns.name')}
      categoryColumn={t('menu.products.columns.category')}
      statusColumn={t('menu.products.columns.status')}
      actionsColumn={t('menu.products.columns.actions')}
      sortByLabel={t('menu.products.sortBy')}
      addLabel={t('menu.products.add')}
      emptyTitle={t('menu.products.emptyTitle')}
      emptyDescription={t('menu.products.emptyDescription')}
      editLabel={t('menu.actions.edit')}
      deleteLabel={t('menu.actions.delete')}
      loadMoreLabel={t('menu.products.loadMore')}
      hasMore={Boolean(data?.nextCursor)}
      onLoadMore={() => {
        if (data?.nextCursor) {
          setCursor(data.nextCursor);
        }
      }}
      isLoadingMore={isFetching && Boolean(cursor)}
      onAdd={() => {
        setEditingId(undefined);
        setSheetOpen(true);
      }}
      onEdit={(product) => {
        setEditingId(product.id);
        setSheetOpen(true);
      }}
      onDelete={(product) => {
        setDeleting(product);
        setConfirmDeleteOpen(true);
      }}
      sheetProps={{
        open: sheetOpen,
        onOpenChange: setSheetOpen,
        title: editingId ? t('menu.products.editTitle') : t('menu.products.createTitle'),
        submitLabel: t('menu.actions.save'),
        cancelLabel: t('menu.actions.cancel'),
        form: productForm.form,
        onSubmit,
        isSaving: createState.isLoading || patchState.isLoading,
        canManage,
        locales: org.locales,
        localeLabels,
        tabLabel: (locale) => t(`auth.locales.${locale}`, { defaultValue: locale }),
        defaultLocale: org.defaultLocale,
        currency: org.defaultCurrency,
        moneyLocale,
        categories: categoryOptions,
        categoryLabel: t('menu.products.fields.category'),
        priceLabel: t('menu.products.fields.price'),
        activeLabel: t('menu.status.active'),
        modifierGroups,
        modifierGroupsLabel: t('menu.products.fields.modifierGroups'),
        modifierGroupLabel: (group) =>
          pickLocalizedName(group.name, org.uiLocale, org.defaultLocale),
        imageUpload: {
          previewUrl: imageUpload.previewUrl,
          label: t('menu.products.imageLabel'),
          hint: t('menu.products.imageHint'),
          chooseLabel: t('menu.products.imageChoose'),
          uploadingLabel: t('menu.products.imageUploading'),
          removeLabel: t('menu.products.imageRemove'),
          previewAlt: t('menu.products.imagePreviewAlt'),
          error: imageError,
          isUploading: imageUpload.isUploading || imageUpload.isRemoving,
          onFileSelect: imageUpload.onFileSelect,
          onRemove: imageUpload.onRemove,
          show: Boolean(editingId && productDetail),
        },
      }}
      confirmDeleteOpen={confirmDeleteOpen}
      onConfirmDeleteOpenChange={setConfirmDeleteOpen}
      onConfirmDelete={() => {
        if (!deleting) {
          return;
        }
        void deleteProduct(deleting.id).then(() => {
          setConfirmDeleteOpen(false);
          setDeleting(undefined);
          setAccumulated((prev) => prev.filter((item) => item.id !== deleting.id));
        });
      }}
      isDeleting={deleteState.isLoading}
      deleteConfirmDescription={t('menu.products.deleteConfirm')}
      cancelLabel={t('menu.actions.cancel')}
    />
  );
}
