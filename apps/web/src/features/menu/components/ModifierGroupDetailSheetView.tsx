import { PlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, Spinner } from '@app/ui';

import type { ModifierGroupDetail } from '@app/shared';

export interface ModifierGroupDetailSheetViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isLoading: boolean;
  group: ModifierGroupDetail | undefined;
  modifierList: ReactNode | undefined;
  addModifierLabel: string;
  canManage: boolean;
  onAddModifier: () => void;
  emptyModifiersTitle: string;
}

export function ModifierGroupDetailSheetView({
  open,
  onOpenChange,
  title,
  isLoading,
  group,
  modifierList,
  addModifierLabel,
  canManage,
  onAddModifier,
  emptyModifiersTitle,
}: ModifierGroupDetailSheetViewProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner label={title} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            {canManage ? (
              <Button type="button" size="sm" onClick={onAddModifier}>
                <PlusIcon className="size-4" aria-hidden />
                {addModifierLabel}
              </Button>
            ) : null}
            {group && group.modifiers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{emptyModifiersTitle}</p>
            ) : (
              modifierList
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
