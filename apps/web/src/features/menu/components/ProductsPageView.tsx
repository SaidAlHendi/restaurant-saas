import type { ComponentProps } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  Badge,
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
  currencyDigits,
  formatMinor,
} from '@app/ui';

import type { Product } from '@app/shared';

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
  categories: { id: string; label: string }[];
  products: Product[];
  isLoading: boolean;
  errorMessage: string | null;
  labelFor: (product: Product) => string;
  categoryLabelFor: (product: Product) => string;
  currency: string;
  locale: string;
  activeLabel: string;
  inactiveLabel: string;
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
  categories,
  products,
  isLoading,
  errorMessage,
  labelFor,
  categoryLabelFor,
  currency,
  locale,
  activeLabel,
  inactiveLabel,
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
            cell: (row) =>
              formatMinor(row.priceMinor, currencyDigits(row.currency || currency), locale),
          },
          {
            id: 'status',
            header: statusColumn,
            cell: (row) => (
              <Badge variant={row.isActive ? 'default' : 'secondary'}>
                {row.isActive ? activeLabel : inactiveLabel}
              </Badge>
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
