import { PlusIcon, Trash2Icon } from 'lucide-react';

import {
  Badge,
  Button,
  IconButton,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
} from '@app/ui';

import type { Modifier, ModifierGroupDetail } from '@app/shared';

export interface ModifierGroupDetailSheetViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isLoading: boolean;
  group: ModifierGroupDetail | undefined;
  modifierLabel: (modifier: Modifier) => string;
  priceLabel: (modifier: Modifier) => string;
  activeLabel: string;
  inactiveLabel: string;
  addModifierLabel: string;
  deleteModifierLabel: string;
  canManage: boolean;
  onAddModifier: () => void;
  onDeleteModifier: (modifier: Modifier) => void;
  emptyModifiersTitle: string;
}

export function ModifierGroupDetailSheetView({
  open,
  onOpenChange,
  title,
  isLoading,
  group,
  modifierLabel,
  priceLabel,
  activeLabel,
  inactiveLabel,
  addModifierLabel,
  deleteModifierLabel,
  canManage,
  onAddModifier,
  onDeleteModifier,
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
              <ul className="flex flex-col gap-2">
                {group?.modifiers.map((modifier) => (
                  <li
                    key={modifier.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="font-medium">{modifierLabel(modifier)}</span>
                      <span className="text-muted-foreground text-xs">{priceLabel(modifier)}</span>
                    </div>
                    <Badge variant={modifier.isActive ? 'default' : 'secondary'}>
                      {modifier.isActive ? activeLabel : inactiveLabel}
                    </Badge>
                    {canManage ? (
                      <IconButton
                        icon={<Trash2Icon />}
                        label={deleteModifierLabel}
                        variant="ghost"
                        onClick={() => {
                          onDeleteModifier(modifier);
                        }}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
