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
  NumberInput,
} from '@app/ui';
import type { UseFormReturn } from 'react-hook-form';

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
  minLabel: string;
  maxLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  locales: string[];
  localeLabels: Record<string, string>;
  fieldLabels: { name: string; description: string };
  tabLabel: (locale: string) => string;
  defaultLocale: string;
  form: UseFormReturn<ModifierGroupFormValues>;
  onSubmit: () => void;
  isSaving: boolean;
}

export function ModifierGroupFormDialogView({
  open,
  onOpenChange,
  mode,
  titleCreate,
  titleEdit,
  submitLabel,
  cancelLabel,
  minLabel,
  maxLabel,
  decreaseLabel,
  increaseLabel,
  locales,
  localeLabels,
  fieldLabels,
  tabLabel,
  defaultLocale,
  form,
  onSubmit,
  isSaving,
}: ModifierGroupFormDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={cancelLabel}>
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
                  name="minSelect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{minLabel}</FormLabel>
                      <FormControl>
                        <NumberInput
                          name={field.name}
                          value={field.value}
                          onValueChange={field.onChange}
                          min={0}
                          decrementLabel={decreaseLabel}
                          incrementLabel={increaseLabel}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxSelect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{maxLabel}</FormLabel>
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
