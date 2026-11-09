import {
  Button,
  Dialog,
  DialogBody,
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

import type { CategoryFormOutput, CategoryFormValues } from '../hooks/use-category-form.js';
import { BranchAvailabilityFieldView } from './BranchAvailabilityFieldView.js';
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
  fieldLabels: { name: string; description: string };
  tabLabel: (locale: string) => string;
  defaultLocale: string;
  form: UseFormReturn<CategoryFormValues, unknown, CategoryFormOutput>;
  /** Where the category is shown. `show` is false when there is no branch to choose from. */
  branchAvailability: {
    show: boolean;
    label: string;
    hint: string;
    allBranchesLabel: string;
    branches: { id: string; name: string }[];
    canChooseAll: boolean;
  };
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
  fieldLabels,
  tabLabel,
  defaultLocale,
  form,
  branchAvailability,
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
            className="contents"
          >
            <DialogBody>
              <LocalizedFieldsView<CategoryFormValues>
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel>{activeLabel}</FormLabel>
                  </FormItem>
                )}
              />
              {branchAvailability.show ? (
                <FormField
                  control={form.control}
                  name="branchIds"
                  render={({ field, fieldState }) => (
                    <BranchAvailabilityFieldView
                      label={branchAvailability.label}
                      hint={branchAvailability.hint}
                      allBranchesLabel={branchAvailability.allBranchesLabel}
                      branches={branchAvailability.branches}
                      canChooseAll={branchAvailability.canChooseAll}
                      value={{
                        availableInAllBranches: form.watch('availableInAllBranches') ?? true,
                        branchIds: field.value ?? [],
                      }}
                      onChange={(next) => {
                        form.setValue('availableInAllBranches', next.availableInAllBranches, {
                          shouldDirty: true,
                        });
                        field.onChange(next.branchIds);
                      }}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              ) : null}
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
