import { PlusIcon } from 'lucide-react';

import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@app/ui';

import type { DiningTableListItem } from '../tables.types.js';
import { TableFormDialogView } from './TableFormDialogView.js';
import type { TableFormDialogViewProps } from './TableFormDialogView.js';

export type TablesPageViewProps = {
  title: string;
  subtitle: string;
  canManage: boolean;
  isLoading: boolean;
  branchMissing: boolean;
  branchMissingTitle: string;
  branchMissingDescription: string;
  items: DiningTableListItem[];
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  tableLabelHeader: string;
  statusHeader: string;
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
  isLoading,
  branchMissing,
  branchMissingTitle,
  branchMissingDescription,
  items,
  addLabel,
  emptyTitle,
  emptyDescription,
  tableLabelHeader,
  statusHeader,
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
    return (
      <EmptyState title={branchMissingTitle} description={branchMissingDescription} />
    );
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tableLabelHeader}</TableHead>
              <TableHead>{statusHeader}</TableHead>
              {canManage ? <TableHead className="w-0" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((table) => (
              <TableRow key={table.id}>
                <TableCell className="font-medium">{table.label}</TableCell>
                <TableCell>
                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={table.isActive}
                        disabled={togglingTableId === table.id}
                        onCheckedChange={(checked) => {
                          onToggleActive(table, checked);
                        }}
                        aria-label={table.label}
                      />
                      <Badge variant={table.isActive ? 'default' : 'secondary'}>
                        {table.isActive ? activeLabel : inactiveLabel}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant={table.isActive ? 'default' : 'secondary'}>
                      {table.isActive ? activeLabel : inactiveLabel}
                    </Badge>
                  )}
                </TableCell>
                {canManage ? (
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={rotatingTableId === table.id}
                      onClick={() => {
                        onRotateQr(table.id);
                      }}
                    >
                      {rotateQrLabel}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <TableFormDialogView open={formOpen} onOpenChange={onFormOpenChange} {...formProps} />
    </div>
  );
}
