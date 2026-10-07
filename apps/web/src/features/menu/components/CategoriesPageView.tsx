import type { ComponentProps, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  Spinner,
} from '@app/ui';

import type { Category } from '@app/shared';

import { CategoryFormDialogView } from './CategoryFormDialogView.js';

export interface CategoriesPageViewProps {
  title: string;
  subtitle: string;
  canManage: boolean;
  isLoading: boolean;
  items: Category[];
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  deleteLabel: string;
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  formMode: 'create' | 'edit';
  formProps: Omit<
    ComponentProps<typeof CategoryFormDialogView>,
    'open' | 'onOpenChange' | 'mode'
  >;
  confirmDeleteOpen: boolean;
  onConfirmDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
  onAdd: () => void;
  sortableRows: ReactNode;
}

export function CategoriesPageView({
  title,
  subtitle,
  canManage,
  isLoading,
  items,
  addLabel,
  emptyTitle,
  emptyDescription,
  deleteLabel,
  formOpen,
  onFormOpenChange,
  formMode,
  formProps,
  confirmDeleteOpen,
  onConfirmDeleteOpenChange,
  onConfirmDelete,
  isDeleting,
  onAdd,
  sortableRows,
}: CategoriesPageViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          canManage ? (
            <Button type="button" onClick={onAdd}>
              <PlusIcon className="size-4" aria-hidden />
              {addLabel}
            </Button>
          ) : null
        }
      />
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner label={title} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="flex flex-col gap-2">{sortableRows}</ul>
      )}
      <CategoryFormDialogView
        open={formOpen}
        onOpenChange={onFormOpenChange}
        mode={formMode}
        {...formProps}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={onConfirmDeleteOpenChange}
        title={deleteLabel}
        description={formProps.deleteHint ?? ''}
        confirmLabel={deleteLabel}
        cancelLabel={formProps.cancelLabel}
        onConfirm={onConfirmDelete}
        isConfirming={isDeleting}
        variant="destructive"
      />
    </div>
  );
}

export interface CategoryRowViewProps {
  category: Category;
  label: string;
  canManage: boolean;
  dragLabel: string;
  editLabel: string;
  deleteLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  dragHandleProps: HTMLAttributes<HTMLButtonElement>;
  rowProps?: HTMLAttributes<HTMLLIElement>;
  style?: CSSProperties;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryRowView({
  category,
  label,
  canManage,
  dragLabel,
  editLabel,
  deleteLabel,
  activeLabel,
  inactiveLabel,
  dragHandleProps,
  rowProps,
  style,
  isDragging,
  isDropTarget,
  onEdit,
  onDelete,
}: CategoryRowViewProps) {
  return (
    <li
      {...rowProps}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card px-3 py-2 ${isDragging ? 'opacity-60 shadow-md' : ''} ${isDropTarget ? 'border-primary ring-1 ring-primary/30' : ''}`}
    >
      {canManage ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground touch-none cursor-grab active:cursor-grabbing"
          aria-label={dragLabel}
          {...dragHandleProps}
        >
          <GripVerticalIcon className="size-5" aria-hidden />
        </button>
      ) : null}
      <span className="flex-1 truncate text-sm font-medium">{label}</span>
      <Badge variant={category.isActive ? 'default' : 'secondary'}>
        {category.isActive ? activeLabel : inactiveLabel}
      </Badge>
      {canManage ? (
        <div className="flex items-center gap-1">
          <IconButton icon={<PencilIcon />} label={editLabel} variant="ghost" onClick={onEdit} />
          <IconButton
            icon={<Trash2Icon />}
            label={deleteLabel}
            variant="ghost"
            onClick={onDelete}
          />
        </div>
      ) : null}
    </li>
  );
}
