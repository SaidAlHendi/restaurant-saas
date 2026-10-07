import type { ComponentProps } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  Spinner,
} from '@app/ui';

import type { ModifierGroup } from '@app/shared';

import { ModifierGroupFormDialogView } from './ModifierGroupFormDialogView.js';

export interface ModifierGroupsPageViewProps {
  title: string;
  subtitle: string;
  canManage: boolean;
  isLoading: boolean;
  groups: ModifierGroup[];
  labelFor: (group: ModifierGroup) => string;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  editLabel: string;
  deleteLabel: string;
  minMaxLabel: (group: ModifierGroup) => string;
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  formMode: 'create' | 'edit';
  formProps: Omit<
    ComponentProps<typeof ModifierGroupFormDialogView>,
    'open' | 'onOpenChange' | 'mode'
  >;
  confirmDeleteOpen: boolean;
  onConfirmDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
  onAdd: () => void;
  onEdit: (group: ModifierGroup) => void;
  onDelete: (group: ModifierGroup) => void;
  onOpen: (group: ModifierGroup) => void;
  openLabel: string;
}

export function ModifierGroupsPageView({
  title,
  subtitle,
  canManage,
  isLoading,
  groups,
  labelFor,
  addLabel,
  emptyTitle,
  emptyDescription,
  editLabel,
  deleteLabel,
  minMaxLabel,
  formOpen,
  onFormOpenChange,
  formMode,
  formProps,
  confirmDeleteOpen,
  onConfirmDeleteOpenChange,
  onConfirmDelete,
  isDeleting,
  onAdd,
  onEdit,
  onDelete,
  onOpen,
  openLabel,
}: ModifierGroupsPageViewProps) {
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
      ) : groups.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Card className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="flex-1 text-start"
                    onClick={() => {
                      onOpen(group);
                    }}
                  >
                    <p className="font-medium">{labelFor(group)}</p>
                    <p className="text-muted-foreground text-sm">{minMaxLabel(group)}</p>
                  </button>
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
                      <IconButton
                        icon={<PencilIcon />}
                        label={editLabel}
                        variant="ghost"
                        onClick={() => {
                          onEdit(group);
                        }}
                      />
                      <IconButton
                        icon={<Trash2Icon />}
                        label={deleteLabel}
                        variant="ghost"
                        onClick={() => {
                          onDelete(group);
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpen(group);
                  }}
                >
                  {openLabel}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ModifierGroupFormDialogView
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
