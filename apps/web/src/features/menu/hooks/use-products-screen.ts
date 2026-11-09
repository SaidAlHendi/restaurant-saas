import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { Product, ProductListQuery } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { formatMoney, intlLocaleForUi, productDisplayCurrency } from '../../../lib/money.js';
import { planGateFromError, planLimitMessageKey } from '../../billing/plan-gate.utils.js';
import { selectCan } from '../../session/session.selectors.js';
import type { ProductsPageViewProps } from '../components/ProductsPageView.js';
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
import { ALL_BRANCHES_FILTER, showBranchAvailability } from '../branch-availability.utils.js';
import { categoryLabel, pickLocalizedName, productLabel } from '../menu.utils.js';
import type { ProductActiveFilter } from '../product-list-filters.js';
import { isMutationError } from '../menu-mutation-result.js';
import { showMenuApiError } from '../show-menu-api-error.js';
import { useCatalogOrg } from './use-catalog-org.js';
import { useProductForm, type ProductFormOutput } from './use-product-form.js';
import { useProductImageUpload, type ProductImageUploadError } from './use-product-image-upload.js';

function imageUploadErrorMessage(t: (key: string) => string, code: ProductImageUploadError | null) {
  if (!code) {
    return null;
  }
  if (code === 'local_unsupported_type') {
    return t('menu.errors.unsupportedImageType');
  }
  if (code === 'local_remove') {
    return t('menu.products.imageRemoveError');
  }
  if (code === 'FILE_TOO_LARGE') {
    return t('menu.errors.fileTooLarge');
  }
  if (code === 'UNSUPPORTED_IMAGE_TYPE') {
    return t('menu.errors.unsupportedImageType');
  }
  return t('menu.products.imageUploadError');
}

export function useProductsScreen(): ProductsPageViewProps {
  const { t } = useTranslation();
  const canManage = useAppSelector(selectCan('menu.manage'));
  const org = useCatalogOrg();
  const moneyLocale = intlLocaleForUi(org.uiLocale);

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
  const categoryIds = useMemo(() => categoryOptions.map((item) => item.id), [categoryOptions]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState(ALL_BRANCHES_FILTER);
  const [activeFilter, setActiveFilter] = useState<ProductActiveFilter>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<Product[]>([]);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  const resetList = useCallback(() => {
    // Do not clear `accumulated`: the data effect below refills it from the (re)fetched first
    // page. Clearing it raced with the refetch and left the list empty until reload.
    setCursor(undefined);
  }, []);

  const listArgs = useMemo((): ProductListQuery => {
    const args: ProductListQuery = {
      limit: 20,
      cursor,
      isActive: undefined,
    };
    if (categoryFilter !== 'all') {
      args.categoryId = categoryFilter;
    }
    if (branchFilter !== ALL_BRANCHES_FILTER) {
      args.branchId = branchFilter;
    }
    if (debouncedSearch.length > 0) {
      args.search = debouncedSearch;
    }
    if (activeFilter === 'active') {
      args.isActive = true;
    } else if (activeFilter === 'inactive') {
      args.isActive = false;
    }
    return args;
  }, [activeFilter, branchFilter, categoryFilter, cursor, debouncedSearch]);

  const { data, isLoading, isFetching, error } = useListProductsQuery(listArgs);
  const { data: modifierGroupsData } = useListModifierGroupsQuery(undefined);
  const modifierGroups = modifierGroupsData?.items ?? [];

  useEffect(() => {
    resetList();
  }, [categoryFilter, branchFilter, debouncedSearch, activeFilter, resetList]);

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
    editingId,
    product: productDetail,
    categoryIds,
    open: sheetOpen,
  });

  const imageUpload = useProductImageUpload(productDetail, {
    onCatalogChanged: resetList,
    onApiError: (err) => {
      showMenuApiError(err, t);
    },
  });

  const navigate = useNavigate();
  const canManageBilling = useAppSelector(selectCan('billing.manage'));
  // Plan limit on create is shown inside the sheet, not as a toast.
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);

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
    void productForm.form.handleSubmit(async (values: ProductFormOutput) => {
      if (editingId && productDetail) {
        const patchResult = await patchProduct({
          productId: editingId,
          body: productForm.toPatchBody(values),
        });
        if (isMutationError(patchResult)) {
          showMenuApiError(patchResult.error, t);
          return;
        }
        const groupsResult = await setModifierGroups({
          productId: editingId,
          body: { groupIds: values.modifierGroupIds },
        });
        if (isMutationError(groupsResult)) {
          showMenuApiError(groupsResult.error, t);
          return;
        }
        resetList();
        setSheetOpen(false);
      } else {
        setPlanLimitMessage(null);
        const createResult = await createProduct(productForm.toCreateBody(values));
        if (isMutationError(createResult)) {
          const gate = planGateFromError(createResult.error);
          if (gate?.kind === 'limit') {
            setPlanLimitMessage(t(planLimitMessageKey(gate.limit), { max: gate.max ?? '' }));
            return;
          }
          showMenuApiError(createResult.error, t);
          return;
        }
        const created = createResult.data;
        if (values.modifierGroupIds.length > 0) {
          const groupsResult = await setModifierGroups({
            productId: created.id,
            body: { groupIds: values.modifierGroupIds },
          });
          if (isMutationError(groupsResult)) {
            showMenuApiError(groupsResult.error, t);
            return;
          }
        }
        const uploaded = await imageUpload.uploadPending(created.id);
        resetList();
        if (uploaded) {
          setSheetOpen(false);
          setEditingId(undefined);
        } else {
          // Product exists but the photo failed: stay open in edit mode so they can retry.
          setEditingId(created.id);
        }
      }
    })();
  };

  const onToggleActive = (product: Product, isActive: boolean) => {
    setTogglingProductId(product.id);
    void patchProduct({
      productId: product.id,
      body: { isActive },
    }).then((result) => {
      setTogglingProductId(null);
      if (isMutationError(result)) {
        showMenuApiError(result.error, t);
        return;
      }
      resetList();
    });
  };

  const { branchScope } = productForm;
  const branchNameById = useMemo(
    () => new Map(branchScope.branches.map((branch) => [branch.id, branch.name])),
    [branchScope.branches],
  );
  const showBranches = showBranchAvailability(branchScope);
  const availabilityLabelFor = (product: Product) => {
    if (product.availableInAllBranches) {
      return t('menu.availability.allBranches');
    }
    if (product.branchIds.length === 1) {
      return branchNameById.get(product.branchIds[0] ?? '') ?? t('menu.availability.count', { count: 1 });
    }
    return t('menu.availability.count', { count: product.branchIds.length });
  };

  const priceLabelFor = (product: Product) =>
    formatMoney(
      product.priceMinor,
      productDisplayCurrency(product, org.defaultCurrency),
      org.uiLocale,
    );

  return {
    title: t('menu.products.title'),
    subtitle: t('menu.products.subtitle'),
    canManage,
    showAdd: canManage && categoryOptions.length > 0,
    searchDefault: '',
    onSearchChange: setDebouncedSearch,
    searchClearLabel: t('menu.products.searchClear'),
    searchPlaceholder: t('menu.products.searchPlaceholder'),
    categoryFilter,
    onCategoryFilterChange: setCategoryFilter,
    branchFilter: showBranches
      ? {
          value: branchFilter,
          onChange: setBranchFilter,
          allLabel: t('menu.availability.filterAll'),
          branches: branchScope.branches,
        }
      : null,
    availabilityColumn: showBranches ? t('menu.availability.column') : null,
    availabilityLabelFor,
    allCategoriesLabel: t('menu.products.allCategories'),
    activeFilter,
    onActiveFilterChange: setActiveFilter,
    allActiveLabel: t('menu.products.allActive'),
    activeOnlyLabel: t('menu.status.active'),
    inactiveOnlyLabel: t('menu.status.inactive'),
    categories: categoryOptions,
    products: accumulated,
    isLoading: isLoading && accumulated.length === 0,
    errorMessage: error ? t('menu.errors.loadFailed') : null,
    labelFor: (product) => productLabel(product, org.uiLocale, org.defaultLocale),
    categoryLabelFor: (product) => categoryNameById.get(product.categoryId) ?? '—',
    priceLabelFor,
    activeLabel: t('menu.status.active'),
    inactiveLabel: t('menu.status.inactive'),
    priceColumn: t('menu.products.columns.price'),
    nameColumn: t('menu.products.columns.name'),
    categoryColumn: t('menu.products.columns.category'),
    statusColumn: t('menu.products.columns.status'),
    actionsColumn: t('menu.products.columns.actions'),
    sortByLabel: t('menu.products.sortBy'),
    addLabel: t('menu.products.add'),
    emptyTitle: t('menu.products.emptyTitle'),
    emptyDescription: t('menu.products.emptyDescription'),
    editLabel: t('menu.actions.edit'),
    deleteLabel: t('menu.actions.delete'),
    loadMoreLabel: t('menu.products.loadMore'),
    hasMore: Boolean(data?.nextCursor),
    onLoadMore: () => {
      if (data?.nextCursor) {
        setCursor(data.nextCursor);
      }
    },
    isLoadingMore: isFetching && Boolean(cursor),
    onAdd: () => {
      setPlanLimitMessage(null);
      imageUpload.reset();
      setEditingId(undefined);
      setSheetOpen(true);
    },
    onEdit: (product) => {
      setEditingId(product.id);
      setSheetOpen(true);
    },
    onDelete: (product) => {
      setDeleting(product);
      setConfirmDeleteOpen(true);
    },
    onToggleActive,
    togglingProductId,
    sheetProps: {
      open: sheetOpen,
      onOpenChange: (open) => {
        setSheetOpen(open);
        if (!open) {
          setEditingId(undefined);
          setPlanLimitMessage(null);
        }
      },
      title: editingId ? t('menu.products.editTitle') : t('menu.products.createTitle'),
      submitLabel: t('menu.actions.save'),
      cancelLabel: t('menu.actions.cancel'),
      form: productForm.form,
      onSubmit,
      isSaving: createState.isLoading || patchState.isLoading || imageUpload.isUploading,
      canManage,
      locales: org.locales,
      localeLabels,
      fieldLabels: { name: t('menu.fields.name'), description: t('menu.fields.description') },
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
      modifierGroupLabel: (group) => pickLocalizedName(group.name, org.uiLocale, org.defaultLocale),
      branchAvailability: {
        show: showBranches,
        label: t('menu.availability.label'),
        hint: branchScope.allBranchesScope
          ? t('menu.availability.hint')
          : t('menu.availability.hintScoped'),
        allBranchesLabel: t('menu.availability.allBranches'),
        branches: branchScope.branches,
        canChooseAll: branchScope.allBranchesScope,
      },
      imageUpload: {
        previewUrl: imageUpload.previewUrl,
        label: t('menu.products.imageLabel'),
        hint: t('menu.products.imageHint'),
        chooseLabel: t('menu.products.imageChoose'),
        uploadingLabel: t('menu.products.imageUploading'),
        removeLabel: t('menu.products.imageRemove'),
        previewAlt: t('menu.products.imagePreviewAlt'),
        error: imageUploadErrorMessage(t, imageUpload.localError),
        isUploading: imageUpload.isUploading || imageUpload.isRemoving,
        onFileSelect: imageUpload.onFileSelect,
        onRemove: imageUpload.onRemove,
        show: !editingId || Boolean(productDetail),
      },
      planLimit:
        planLimitMessage === null
          ? null
          : {
              message: planLimitMessage,
              upgradeLabel: canManageBilling ? t('billing.upgrade.seePlans') : null,
              onUpgrade: () => {
                void navigate('/dashboard/billing');
              },
            },
    },
    confirmDeleteOpen,
    onConfirmDeleteOpenChange: setConfirmDeleteOpen,
    onConfirmDelete: () => {
      if (!deleting) {
        return;
      }
      void deleteProduct(deleting.id).then((result) => {
        if (isMutationError(result)) {
          showMenuApiError(result.error, t);
          return;
        }
        setConfirmDeleteOpen(false);
        setDeleting(undefined);
        resetList();
      });
    },
    isDeleting: deleteState.isLoading,
    deleteConfirmDescription: t('menu.products.deleteConfirm'),
    cancelLabel: t('menu.actions.cancel'),
  };
}
