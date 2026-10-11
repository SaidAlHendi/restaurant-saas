import {
  Button,
  Checkbox,
  Label,
  NumberInput,
  RadioGroup,
  RadioGroupItem,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@app/ui';

import type { PosPageViewModel } from '../hooks/use-pos-page.js';
import { posLocalizedName } from '../pos-label.utils.js';

type ModifierSheetVm = PosPageViewModel['modifierSheet'];

export function PosModifierSheetView({
  sheet,
}: {
  sheet: ModifierSheetVm;
}) {
  const product = sheet.product;
  if (!product) {
    return null;
  }

  return (
    <Sheet open={sheet.open} onOpenChange={sheet.onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sheet.productName}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 py-4">
          {product.modifierGroups.map((group) => (
            <div key={group.id} className="space-y-3">
              <p className="font-medium">
                {posLocalizedName(group.name, sheet.locale, sheet.defaultLocale)}
              </p>
              {group.maxSelect === 1 ? (
                <RadioGroup
                  value={
                    sheet.selectedModifierIds.find((id) =>
                      group.modifiers.some((m) => m.id === id),
                    ) ?? ''
                  }
                  onValueChange={(value) => {
                    sheet.toggleModifier(group.id, value, group.maxSelect);
                  }}
                >
                  {group.modifiers.map((mod) => (
                    <div key={mod.id} className="flex items-center gap-2">
                      <RadioGroupItem value={mod.id} id={`mod-${mod.id}`} />
                      <Label htmlFor={`mod-${mod.id}`} className="flex-1">
                        {posLocalizedName(mod.name, sheet.locale, sheet.defaultLocale)}
                        {mod.priceDeltaMinor > 0
                          ? ` (+${sheet.formatMinor(mod.priceDeltaMinor)})`
                          : ''}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                group.modifiers.map((mod) => {
                  const checked = sheet.selectedModifierIds.includes(mod.id);
                  return (
                    <div key={mod.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`mod-${mod.id}`}
                        checked={checked}
                        onCheckedChange={() => {
                          sheet.toggleModifier(group.id, mod.id, group.maxSelect);
                        }}
                      />
                      <Label htmlFor={`mod-${mod.id}`} className="flex-1">
                        {posLocalizedName(mod.name, sheet.locale, sheet.defaultLocale)}
                        {mod.priceDeltaMinor > 0
                          ? ` (+${sheet.formatMinor(mod.priceDeltaMinor)})`
                          : ''}
                      </Label>
                    </div>
                  );
                })
              )}
            </div>
          ))}
          <div className="space-y-2">
            <Label>{sheet.quantityLabel}</Label>
            <NumberInput
              min={1}
              max={999}
              value={sheet.quantity}
              onValueChange={(value) => {
                sheet.setQuantity(value ?? 1);
              }}
              decrementLabel={sheet.decrementLabel}
              incrementLabel={sheet.incrementLabel}
            />
          </div>
          <div className="space-y-2">
            <Label>{sheet.noteLabel}</Label>
            <Textarea
              value={sheet.note}
              onChange={(event) => {
                sheet.setNote(event.target.value);
              }}
              placeholder={sheet.notePlaceholder}
              rows={2}
            />
          </div>
          {sheet.validationError ? (
            <p className="text-destructive text-sm">{sheet.validationMessage}</p>
          ) : null}
        </div>
        <SheetFooter>
          <Button type="button" size="touch" className="w-full" onClick={sheet.addToCart}>
            {sheet.addLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
