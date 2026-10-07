import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  FormItem,
  FormLabel,
  Switch,
} from '@app/ui';
import type { UseFormReturn } from 'react-hook-form';

import type { CategoryFormValues } from '../hooks/use-category-form.js';
import { LocalizedFieldsView } from './LocalizedFieldsView.js';

export interface CategoryFormDialogViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  titleCreate: string;
  titleEdit: string;
  submitLabel: string;
  cancelLabel: string;
  deleteHint?: string;
  activeLabel: string;
  locales: string[];
  localeLabels: Record<string, string>;
  tabLabel: (locale: string) => string;
  defaultLocale: string;
  form: UseFormReturn<CategoryFormValues>;
  onSubmit: () => void;
  isSaving: boolean;
}

export function CategoryFormDialogView({
  open,
  onOpenChange,
  mode,
  titleCreate,
  titleEdit,
  submitLabel,
  cancelLabel,
  activeLabel,
  locales,
  localeLabels,
  tabLabel,
  defaultLocale,
  form,
  onSubmit,
  isSaving,
}: CategoryFormDialogViewProps) {
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
            className="flex flex-col gap-4"
          >
            <LocalizedFieldsView<CategoryFormValues>
              control={form.control}
              namePrefix="name"
              locales={locales}
              labels={localeLabels}
              tabLabel={tabLabel}
              requiredLocale={defaultLocale}
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
            <DialogFooter className="gap-2 sm:gap-0">
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
