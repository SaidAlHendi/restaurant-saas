import type { ComponentProps } from 'react';

import {
  Button,
  Dialog,
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
  Input,
} from '@app/ui';

import type { UseFormReturn } from 'react-hook-form';

import type { TableFormValues } from '../hooks/use-table-form.js';

export type TableFormDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  labelFieldLabel: string;
  form: UseFormReturn<TableFormValues, unknown, TableFormValues>;
  onSubmit: ComponentProps<'form'>['onSubmit'];
  isSubmitting: boolean;
};

export function TableFormDialogView({
  open,
  onOpenChange,
  title,
  submitLabel,
  cancelLabel,
  labelFieldLabel,
  form,
  onSubmit,
  isSubmitting,
}: TableFormDialogViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labelFieldLabel}</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
