import { PlusIcon } from 'lucide-react';

import { Badge, Button, EmptyState, PageHeader, Spinner, Switch, cn } from '@app/ui';

import type { DiningTableListItem } from '../tables.types.js';
import { TableFormDialogView } from './TableFormDialogView.js';
import type { TableFormDialogViewProps } from './TableFormDialogView.js';

function Chair({ horizontal = false, active }: { horizontal?: boolean; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'rounded-md',
        horizontal ? 'h-3 w-10' : 'h-10 w-3',
        active ? 'bg-primary/30' : 'bg-muted-foreground/20',
      )}
    />
  );
}

export type TablesPageViewProps = {
  title: string;
  subtitle: string;
  canManage: boolean;
  canRotateQr: boolean;
  isLoading: boolean;
  branchMissing: boolean;
  branchMissingTitle: string;
  branchMissingDescription: string;
  items: DiningTableListItem[];
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  activeLabel: string;
  inactiveLabel: string;
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  formProps: Omit<TableFormDialogViewProps, 'open' | 'onOpenChange'>;
  onAdd: () => void;
  onToggleActive: (table: DiningTableListItem, next: boolean) => void;
  togglingTableId: string | null;
  rotateQrLabel: string;
  rotatingTableId: string | null;
  onRotateQr: (tableId: string) => void;
};

export function TablesPageView({
  title,
  subtitle,
  canManage,
  canRotateQr,
  isLoading,
  branchMissing,
  branchMissingTitle,
  branchMissingDescription,
  items,
  addLabel,
  emptyTitle,
  emptyDescription,
  activeLabel,
  inactiveLabel,
  formOpen,
  onFormOpenChange,
  formProps,
  onAdd,
  onToggleActive,
  togglingTableId,
  rotateQrLabel,
  rotatingTableId,
  onRotateQr,
}: TablesPageViewProps) {
  if (branchMissing) {
    return <EmptyState title={branchMissingTitle} description={branchMissingDescription} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          canManage ? (
            <Button type="button" onClick={onAdd}>
              <PlusIcon aria-hidden className="size-4" />
              {addLabel}
            </Button>
          ) : null
        }
      />
      {isLoading ? (
        <Spinner label={title} />
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((table) => (
            <li
              key={table.id}
              className={cn(
                'bg-card flex flex-col items-center gap-4 rounded-xl border p-5',
                !table.isActive && 'border-dashed opacity-70',
              )}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex gap-2">
                  <Chair horizontal active={table.isActive} />
                  <Chair horizontal active={table.isActive} />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col gap-2">
                    <Chair active={table.isActive} />
                    <Chair active={table.isActive} />
                  </div>
                  <div
                    className={cn(
                      'flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 shadow-sm',
                      table.isActive
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-muted-foreground/30 bg-muted',
                    )}
                  >
                    <span className="max-w-full truncate px-2 text-lg font-semibold">
                      {table.label}
                    </span>
                    <Badge variant={table.isActive ? 'default' : 'secondary'}>
                      {table.isActive ? activeLabel : inactiveLabel}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Chair active={table.isActive} />
                    <Chair active={table.isActive} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Chair horizontal active={table.isActive} />
                  <Chair horizontal active={table.isActive} />
                </div>
              </div>
              {canManage || canRotateQr ? (
                <div className="flex w-full items-center justify-between gap-2">
                  {canManage ? (
                    <Switch
                      checked={table.isActive}
                      disabled={togglingTableId === table.id}
                      onCheckedChange={(checked) => {
                        onToggleActive(table, checked);
                      }}
                      aria-label={table.label}
                    />
                  ) : (
                    <span />
                  )}
                  {canRotateQr ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={rotatingTableId === table.id}
                      onClick={() => {
                        onRotateQr(table.id);
                      }}
                    >
                      {rotateQrLabel}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <TableFormDialogView open={formOpen} onOpenChange={onFormOpenChange} {...formProps} />
    </div>
  );
}
