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
  MoneyInput,
  Switch,
} from '@app/ui';
import type { UseFormReturn } from 'react-hook-form';

import type { ModifierFormValues } from '../hooks/use-modifier-form.js';
import { LocalizedFieldsView } from './LocalizedFieldsView.js';

export interface ModifierFormDialogViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  priceLabel: string;
  activeLabel: string;
  currency: string;
  moneyLocale: string;
  locales: string[];
  localeLabels: Record<string, string>;
  fieldLabels: { name: string; description: string };
  tabLabel: (locale: string) => string;
  defaultLocale: string;
  form: UseFormReturn<ModifierFormValues>;
  onSubmit: () => void;
  isSaving: boolean;
}

export function ModifierFormDialogView({
  open,
  onOpenChange,
  title,
  submitLabel,
  cancelLabel,
  priceLabel,
  activeLabel,
  currency,
  moneyLocale,
  locales,
  localeLabels,
  fieldLabels,
  tabLabel,
  defaultLocale,
  form,
  onSubmit,
  isSaving,
}: ModifierFormDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={cancelLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
              <LocalizedFieldsView<ModifierFormValues>
                control={form.control}
                namePrefix="name"
                label={fieldLabels.name}
                locales={locales}
                labels={localeLabels}
                tabLabel={tabLabel}
                requiredLocale={defaultLocale}
              />
              <FormField
                control={form.control}
                name="priceDeltaMinor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{priceLabel}</FormLabel>
                    <FormControl>
                      <MoneyInput
                        name={field.name}
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
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel>{activeLabel}</FormLabel>
                  </FormItem>
                )}
              />
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
