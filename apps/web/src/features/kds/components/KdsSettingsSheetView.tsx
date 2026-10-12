import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@app/ui';

import type { KdsPageViewModel } from '../hooks/use-kds-page.js';

export function KdsSettingsSheetView({
  open,
  onOpenChange,
  title,
  description,
  amberLabel,
  redLabel,
  amberValue,
  redValue,
  onAmberChange,
  onRedChange,
  invalidMessage,
  saveLabel,
  saveDisabled,
  onSave,
}: KdsPageViewModel['settingsSheet']) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="kds-amber-minutes">{amberLabel}</Label>
            <Input
              id="kds-amber-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              className="h-12"
              value={amberValue}
              onChange={(e) => {
                onAmberChange(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="kds-red-minutes">{redLabel}</Label>
            <Input
              id="kds-red-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              className="h-12"
              value={redValue}
              onChange={(e) => {
                onRedChange(e.target.value);
              }}
            />
          </div>
          {invalidMessage ? <p className="text-destructive text-sm">{invalidMessage}</p> : null}
        </div>
        <SheetFooter>
          <Button type="button" size="touch" onClick={onSave} disabled={saveDisabled}>
            {saveLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
