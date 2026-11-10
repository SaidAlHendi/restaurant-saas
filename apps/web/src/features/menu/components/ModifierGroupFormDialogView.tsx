import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  HelpTip,
  IconButton,
  Input,
  MoneyInput,
  NumberInput,
  Switch,
} from '@app/ui';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form';

import type { ModifierGroupFormValues } from '../hooks/use-modifier-group-form.js';
import { LocalizedFieldsView } from './LocalizedFieldsView.js';

export interface ModifierGroupFormDialogViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  titleCreate: string;
  titleEdit: string;
  submitLabel: string;
  cancelLabel: string;
  deleteHint?: string;
  decreaseLabel: string;
  increaseLabel: string;
  locales: string[];
  localeLabels: Record<string, string>;
  fieldLabels: { name: string; description: string };
  tabLabel: (locale: string) => string;
  defaultLocale: string;
  currency: string;
  moneyLocale: string;
  form: UseFormReturn<ModifierGroupFormValues>;
  modifierRows: Pick<
    UseFieldArrayReturn<ModifierGroupFormValues, 'modifiers'>,
    'fields' | 'append' | 'remove'
  >;
  emptyModifierRow: { name: string; priceDeltaMinor: number };
  onSubmit: () => void;
  isSaving: boolean;
  requiredLabel: string;
  requiredHelp: string;
  maxLabel: string;
  maxHelp: string;
  /** One sentence describing what the cashier/customer will see for the current choices. */
  summaryFor: (values: Pick<ModifierGroupFormValues, 'isRequired' | 'maxSelect'>) => string;
  modifiersTitle: string;
  modifiersHelp: string;
  modifierNameLabel: string;
  modifierPriceLabel: string;
  addRowLabel: string;
  removeRowLabel: string;
  /** Shown in edit mode: modifiers are managed from the group card. */
  modifiersLaterHint: string;
  helpLabel: string;
}

export function ModifierGroupFormDialogView({
  open,
  onOpenChange,
  mode,
  titleCreate,
  titleEdit,
  submitLabel,
  cancelLabel,
  decreaseLabel,
  increaseLabel,
  locales,
  localeLabels,
  fieldLabels,
  tabLabel,
  defaultLocale,
  currency,
  moneyLocale,
  form,
  modifierRows,
  emptyModifierRow,
  onSubmit,
  isSaving,
  requiredLabel,
  requiredHelp,
  maxLabel,
  maxHelp,
  summaryFor,
  modifiersTitle,
  modifiersHelp,
  modifierNameLabel,
  modifierPriceLabel,
  addRowLabel,
  removeRowLabel,
  modifiersLaterHint,
  helpLabel,
}: ModifierGroupFormDialogViewProps) {
  const watched = form.watch(['isRequired', 'maxSelect']);
  const summary = summaryFor({ isRequired: watched[0], maxSelect: watched[1] });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? titleCreate : titleEdit}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="contents"
          >
            <DialogBody>
              <LocalizedFieldsView<ModifierGroupFormValues>
                control={form.control}
                namePrefix="name"
                label={fieldLabels.name}
                locales={locales}
                labels={localeLabels}
                tabLabel={tabLabel}
                requiredLocale={defaultLocale}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1">
                        <FormLabel>{requiredLabel}</FormLabel>
                        <HelpTip label={helpLabel}>{requiredHelp}</HelpTip>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxSelect"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1">
                        <FormLabel>{maxLabel}</FormLabel>
                        <HelpTip label={helpLabel}>{maxHelp}</HelpTip>
                      </div>
                      <FormControl>
                        <NumberInput
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                          min={1}
                          decrementLabel={decreaseLabel}
                          incrementLabel={increaseLabel}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {summary}
              </p>
              {mode === 'create' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium">{modifiersTitle}</p>
                    <HelpTip label={helpLabel}>{modifiersHelp}</HelpTip>
                  </div>
                  {modifierRows.fields.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-[1fr_8rem_auto] items-start gap-2">
                      <FormField
                        control={form.control}
                        name={`modifiers.${index.toString()}.name` as `modifiers.${number}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                aria-label={modifierNameLabel}
                                placeholder={modifierNameLabel}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={
                          `modifiers.${index.toString()}.priceDeltaMinor` as `modifiers.${number}.priceDeltaMinor`
                        }
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <MoneyInput
                                name={field.name}
                                aria-label={modifierPriceLabel}
                                value={field.value}
                                onValueChange={field.onChange}
                                onBlur={field.onBlur}
                                currency={currency}
                                locale={moneyLocale}
                                allowNegative
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <IconButton
                        icon={<Trash2Icon />}
                        label={removeRowLabel}
                        variant="ghost"
                        onClick={() => {
                          modifierRows.remove(index);
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      modifierRows.append({ ...emptyModifierRow });
                    }}
                  >
                    <PlusIcon className="size-4" aria-hidden />
                    {addRowLabel}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{modifiersLaterHint}</p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
