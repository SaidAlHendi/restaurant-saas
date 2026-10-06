import { ClockIcon, CopyIcon, DownloadIcon, InfoIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import type { DevUiConfirmState, DevUiMenuState } from '../use-dev-ui-page.js';
import { ShowcaseRow, ShowcaseSection } from './ShowcaseSection.js';

export interface OverlaysSectionProps {
  copy: DevUiCopy;
  idPrefix: string;
  menu: DevUiMenuState;
  confirm: DevUiConfirmState;
}

export function OverlaysSection({ copy, idPrefix, menu, confirm }: OverlaysSectionProps) {
  const o = copy.overlays;
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <ShowcaseSection title={copy.sections.overlays}>
      <ShowcaseRow label="Popover / DropdownMenu / Tooltip">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <ClockIcon aria-hidden />
              {o.popoverTrigger}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <p className="font-medium">{o.popoverTitle}</p>
            <p className="text-sm text-muted-foreground">{o.popoverBody}</p>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{o.menuTrigger}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel>{o.menuLabel}</DropdownMenuLabel>
            <DropdownMenuItem>
              <PencilIcon aria-hidden />
              {o.menuEdit}
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CopyIcon aria-hidden />
              {o.menuDuplicate}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={menu.showArchived}
              onCheckedChange={menu.onShowArchivedChange}
            >
              {o.menuShowArchived}
            </DropdownMenuCheckboxItem>
            <DropdownMenuLabel inset>{o.menuSortBy}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={menu.sortBy} onValueChange={menu.onSortByChange}>
              <DropdownMenuRadioItem value="name">{o.menuSortName}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price">{o.menuSortPrice}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{o.menuMore}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  <DownloadIcon aria-hidden />
                  {o.menuExport}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem variant="destructive">
              <Trash2Icon aria-hidden />
              {o.menuDelete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">
              <InfoIcon aria-hidden />
              {o.tooltipTrigger}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{o.tooltipText}</TooltipContent>
        </Tooltip>
      </ShowcaseRow>

      <ShowcaseRow label="Dialog / ConfirmDialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">{o.dialogTrigger}</Button>
          </DialogTrigger>
          <DialogContent closeLabel={o.close}>
            <DialogHeader>
              <DialogTitle>{o.dialogTitle}</DialogTitle>
              <DialogDescription>{o.dialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={id('dialog-name')}>{copy.fields.name}</Label>
              <Input id={id('dialog-name')} defaultValue={copy.fields.namePlaceholder} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={id('dialog-notes')}>{copy.fields.notes}</Label>
              <Textarea id={id('dialog-notes')} placeholder={copy.fields.notesPlaceholder} />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{o.close}</Button>
              </DialogClose>
              <Button>{o.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirm.open}
          onOpenChange={confirm.onOpenChange}
          trigger={<Button variant="destructive">{o.confirmTrigger}</Button>}
          title={o.confirmTitle}
          description={o.confirmDescription}
          confirmLabel={o.confirmAction}
          cancelLabel={o.confirmCancel}
          variant="destructive"
          onConfirm={confirm.onConfirm}
          isConfirming={confirm.isConfirming}
        />
      </ShowcaseRow>

      <ShowcaseRow label="Sheet (start / end follow the reading direction)">
        {(['start', 'end', 'bottom'] as const).map((side) => (
          <Sheet key={side}>
            <SheetTrigger asChild>
              <Button variant="outline">
                {side === 'start' ? o.sheetStart : side === 'end' ? o.sheetEnd : o.sheetBottom}
              </Button>
            </SheetTrigger>
            <SheetContent side={side} closeLabel={o.close}>
              <SheetHeader>
                <SheetTitle>{o.sheetTitle}</SheetTitle>
                <SheetDescription>{o.sheetDescription}</SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <Button size="touch">{o.save}</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ))}
      </ShowcaseRow>
    </ShowcaseSection>
  );
}
