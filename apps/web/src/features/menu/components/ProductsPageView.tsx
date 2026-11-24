import type { ComponentProps } from 'react';

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  IconButton,
  NumberedPagination,
  PageHeader,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@app/ui';
import { LayersIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import type { Product, ProductListItem } from '@app/shared';

import type { ListPaginationViewModel } from '../../../lib/pagination.js';

import type { ProductActiveFilter } from '../product-list-filters.js';

import { ModifierGroupFormDialogView } from './ModifierGroupFormDialogView.js';
import { ProductFormSheetView } from './ProductFormSheetView.js';

export interface ProductsPageViewProps {
  title: string;
  subtitle: string;
  canManage: boolean;
  showAdd: boolean;
  /** Set when no category exists yet: products cannot be added until one is created. */
  noCategories: {
    title: string;
    description: string;
    actionLabel: string | null;
    onAction: () => void;
  } | null;
  searchDefault: string;
  onSearchChange: (value: string) => void;
  searchClearLabel: string;
  searchPlaceholder: string;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  /** Branch filter; null when the member has a single branch. */
  branchFilter: {
    value: string;
    onChange: (value: string) => void;
    allLabel: string;
    branches: { id: string; name: string }[];
  } | null;
  /** Column showing where each product is available; null when there is one branch. */
  availabilityColumn: string | null;
  availabilityLabelFor: (product: Product) => string;
  allCategoriesLabel: string;
  activeFilter: ProductActiveFilter;
  onActiveFilterChange: (value: ProductActiveFilter) => void;
  allActiveLabel: string;
  activeOnlyLabel: string;
  inactiveOnlyLabel: string;
  categories: { id: string; label: string }[];
  products: ProductListItem[];
  /** "Options" column: shows how many modifier groups a product has. */
  optionsColumn: string;
  optionsLabelFor: (product: ProductListItem) => string | null;
  isLoading: boolean;
  errorMessage: string | null;
  labelFor: (product: Product) => string;
  categoryLabelFor: (product: Product) => string;
  priceLabelFor: (product: Product) => string;
  activeLabel: string;
  inactiveLabel: string;
  onToggleActive: (product: Product, isActive: boolean) => void;
  togglingProductId: string | null;
  priceColumn: string;
  nameColumn: string;
  categoryColumn: string;
  statusColumn: string;
  actionsColumn: string;
  sortByLabel: string;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  editLabel: string;
  deleteLabel: string;
  pagination: ListPaginationViewModel;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  sheetProps: ComponentProps<typeof ProductFormSheetView>;
  newGroupDialog: ComponentProps<typeof ModifierGroupFormDialogView>;
  confirmDeleteOpen: boolean;
  onConfirmDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
  deleteConfirmDescription: string;
  cancelLabel: string;
}

export function ProductsPageView({
  title,
  subtitle,
  canManage,
  showAdd,
  noCategories,
  searchDefault,
  onSearchChange,
  searchClearLabel,
  searchPlaceholder,
  categoryFilter,
  onCategoryFilterChange,
  branchFilter,
  availabilityColumn,
  availabilityLabelFor,
  allCategoriesLabel,
  activeFilter,
  onActiveFilterChange,
  allActiveLabel,
  activeOnlyLabel,
  inactiveOnlyLabel,
  categories,
  products,
  isLoading,
  errorMessage,
  labelFor,
  categoryLabelFor,
  priceLabelFor,
  activeLabel,
  inactiveLabel,
  onToggleActive,
  togglingProductId,
  priceColumn,
  nameColumn,
  categoryColumn,
  statusColumn,
  actionsColumn,
  sortByLabel,
  addLabel,
  emptyTitle,
  emptyDescription,
  editLabel,
  deleteLabel,
  pagination,
  onAdd,
  onEdit,
  onDelete,
  sheetProps,
  newGroupDialog,
  optionsColumn,
  optionsLabelFor,
  confirmDeleteOpen,
  onConfirmDeleteOpenChange,
  onConfirmDelete,
  isDeleting,
  deleteConfirmDescription,
  cancelLabel,
}: ProductsPageViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          showAdd ? (
            <Button type="button" onClick={onAdd}>
              <PlusIcon className="size-4" aria-hidden />
              {addLabel}
            </Button>
          ) : null
        }
      />
      {noCategories ? (
        <EmptyState
          icon={<LayersIcon className="size-8" aria-hidden />}
          title={noCategories.title}
          description={noCategories.description}
          action={
            noCategories.actionLabel ? (
              <Button type="button" onClick={noCategories.onAction}>
                <PlusIcon className="size-4" aria-hidden />
                {noCategories.actionLabel}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              defaultValue={searchDefault}
              onValueChange={onSearchChange}
              clearLabel={searchClearLabel}
              placeholder={searchPlaceholder}
              className="sm:max-w-xs"
            />
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder={allCategoriesLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{allCategoriesLabel}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {branchFilter ? (
              <Select value={branchFilter.value} onValueChange={branchFilter.onChange}>
                <SelectTrigger className="sm:max-w-xs">
                  <SelectValue placeholder={branchFilter.allLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{branchFilter.allLabel}</SelectItem>
                  {branchFilter.branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select
              value={activeFilter}
              onValueChange={(value) => {
                onActiveFilterChange(value as ProductActiveFilter);
              }}
            >
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder={allActiveLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{allActiveLabel}</SelectItem>
                <SelectItem value="active">{activeOnlyLabel}</SelectItem>
                <SelectItem value="inactive">{inactiveOnlyLabel}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={[
              {
                id: 'name',
                header: nameColumn,
                cell: (row) => labelFor(row),
              },
              {
                id: 'category',
                header: categoryColumn,
                cell: (row) => categoryLabelFor(row),
              },
              {
                id: 'price',
                header: priceColumn,
                cell: (row) => priceLabelFor(row),
              },
              {
                id: 'options',
                header: optionsColumn,
                cell: (row: ProductListItem) => {
                  const label = optionsLabelFor(row);
                  return label ? (
                    <Badge variant="secondary">{label}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  );
                },
              },
              ...(availabilityColumn
                ? [
                    {
                      id: 'availability',
                      header: availabilityColumn,
                      cell: (row: Product) => availabilityLabelFor(row),
                    },
                  ]
                : []),
              {
                id: 'status',
                header: statusColumn,
                cell: (row) =>
                  canManage ? (
                    <Switch
                      checked={row.isActive}
                      disabled={togglingProductId === row.id}
                      aria-label={row.isActive ? activeLabel : inactiveLabel}
                      onCheckedChange={(checked) => {
                        onToggleActive(row, checked);
                      }}
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {row.isActive ? activeLabel : inactiveLabel}
                    </span>
                  ),
              },
            ]}
            data={products}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            error={
              errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : undefined
            }
            emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
            labels={{ actions: actionsColumn, sortBy: sortByLabel }}
            rowActions={
              canManage
                ? (row) => (
                    <div className="flex justify-end gap-1">
                      <IconButton
                        icon={<PencilIcon />}
                        label={editLabel}
                        variant="ghost"
                        onClick={() => {
                          onEdit(row);
                        }}
                      />
                      <IconButton
                        icon={<Trash2Icon />}
                        label={deleteLabel}
                        variant="ghost"
                        onClick={() => {
                          onDelete(row);
                        }}
                      />
                    </div>
                  )
                : undefined
            }
          />
          {pagination.pageCount > 1 ? (
            <NumberedPagination
              page={pagination.page}
              pageCount={pagination.pageCount}
              onPageChange={pagination.onPageChange}
              labels={pagination.labels}
            />
          ) : null}
        </>
      )}
      <ProductFormSheetView {...sheetProps} />
      <ModifierGroupFormDialogView {...newGroupDialog} />
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={onConfirmDeleteOpenChange}
        title={deleteLabel}
        description={deleteConfirmDescription}
        confirmLabel={deleteLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirmDelete}
        isConfirming={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
