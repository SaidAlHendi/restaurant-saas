import type { ComponentProps } from 'react';

import {
  Alert,
  AlertDescription,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  IconButton,
  PageHeader,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@app/ui';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import type { Product } from '@app/shared';

import type { ProductActiveFilter } from '../product-list-filters.js';

import { ProductFormSheetView } from './ProductFormSheetView.js';

export interface ProductsPageViewProps {
  title: string;
  subtitle: string;
  canManage: boolean;
  showAdd: boolean;
  searchDefault: string;
  onSearchChange: (value: string) => void;
  searchClearLabel: string;
  searchPlaceholder: string;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  allCategoriesLabel: string;
  activeFilter: ProductActiveFilter;
  onActiveFilterChange: (value: ProductActiveFilter) => void;
  allActiveLabel: string;
  activeOnlyLabel: string;
  inactiveOnlyLabel: string;
  categories: { id: string; label: string }[];
  products: Product[];
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
  loadMoreLabel: string;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  sheetProps: ComponentProps<typeof ProductFormSheetView>;
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
  searchDefault,
  onSearchChange,
  searchClearLabel,
  searchPlaceholder,
  categoryFilter,
  onCategoryFilterChange,
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
  loadMoreLabel,
  hasMore,
  onLoadMore,
  isLoadingMore,
  onAdd,
  onEdit,
  onDelete,
  sheetProps,
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
      {hasMore ? (
        <Button type="button" variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
          {loadMoreLabel}
        </Button>
      ) : null}
      <ProductFormSheetView {...sheetProps} />
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
