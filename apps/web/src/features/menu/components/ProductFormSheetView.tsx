import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  ImageUpload,
  MoneyInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
} from '@app/ui';
import type { UseFormReturn } from 'react-hook-form';

import type { ModifierGroup } from '@app/shared';

import type { ProductFormOutput, ProductFormValues } from '../hooks/use-product-form.js';
import { BranchAvailabilityFieldView } from './BranchAvailabilityFieldView.js';
import { LocalizedFieldsView } from './LocalizedFieldsView.js';

export interface ProductFormSheetViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  form: UseFormReturn<ProductFormValues, unknown, ProductFormOutput>;
  onSubmit: () => void;
  isSaving: boolean;
  canManage: boolean;
  locales: string[];
  localeLabels: Record<string, string>;
  fieldLabels: { name: string; description: string };
  tabLabel: (locale: string) => string;
  defaultLocale: string;
  currency: string;
  moneyLocale: string;
  categories: { id: string; label: string }[];
  categoryLabel: string;
  priceLabel: string;
  activeLabel: string;
  modifierGroups: ModifierGroup[];
  modifierGroupsLabel: string;
  modifierGroupLabel: (group: ModifierGroup) => string;
  /** Where the product is shown. `show` is false when there is no branch to choose from. */
  branchAvailability: {
    show: boolean;
    label: string;
    hint: string;
    allBranchesLabel: string;
    branches: { id: string; name: string }[];
    canChooseAll: boolean;
  };
  imageUpload: {
    previewUrl: string | null;
    label: string;
    hint: string;
    chooseLabel: string;
    uploadingLabel: string;
    removeLabel: string;
    previewAlt: string;
    error: string | null;
    isUploading: boolean;
    onFileSelect: (file: File) => void;
    onRemove: () => void;
    show: boolean;
  };
  /** Plan limit reached on create (e.g. 40 products on Free). */
  planLimit?: { message: string; upgradeLabel: string | null; onUpgrade: () => void } | null;
}

export function ProductFormSheetView({
  open,
  onOpenChange,
  title,
  submitLabel,
  cancelLabel,
  form,
  onSubmit,
  isSaving,
  canManage,
  locales,
  localeLabels,
  fieldLabels,
  tabLabel,
  defaultLocale,
  currency,
  moneyLocale,
  categories,
  categoryLabel,
  priceLabel,
  activeLabel,
  modifierGroups,
  modifierGroupsLabel,
  modifierGroupLabel,
  branchAvailability,
  imageUpload,
  planLimit = null,
}: ProductFormSheetViewProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="contents"
          >
            <SheetBody>
              {planLimit ? (
                <Alert variant="warning">
                  <AlertDescription>
                    <p>{planLimit.message}</p>
                    {planLimit.upgradeLabel ? (
                      <Button type="button" variant="link" className="h-auto p-0" onClick={planLimit.onUpgrade}>
                        {planLimit.upgradeLabel}
                      </Button>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{categoryLabel}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canManage}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <LocalizedFieldsView<ProductFormValues>
                control={form.control}
                namePrefix="name"
                label={fieldLabels.name}
                locales={locales}
                labels={localeLabels}
                tabLabel={tabLabel}
                requiredLocale={defaultLocale}
              />
              <LocalizedFieldsView<ProductFormValues>
                control={form.control}
                namePrefix="description"
                label={fieldLabels.description}
                locales={locales}
                labels={localeLabels}
                tabLabel={tabLabel}
              />
              <FormField
                control={form.control}
                name="priceMinor"
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
                        disabled={!canManage}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canManage}
                    />
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
                      disabled={!canManage}
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
              {modifierGroups.length > 0 ? (
                <FormField
                  control={form.control}
                  name="modifierGroupIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{modifierGroupsLabel}</FormLabel>
                      <div className="flex flex-col gap-2">
                        {modifierGroups.map((group) => {
                          const checked = field.value.includes(group.id);
                          return (
                            <label key={group.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                disabled={!canManage}
                                onCheckedChange={(value) => {
                                  const next = value
                                    ? [...field.value, group.id]
                                    : field.value.filter((id) => id !== group.id);
                                  field.onChange(next);
                                }}
                              />
                              {modifierGroupLabel(group)}
                            </label>
                          );
                        })}
                      </div>
                    </FormItem>
                  )}
                />
              ) : null}
              {imageUpload.show ? (
                <ImageUpload
                  previewUrl={imageUpload.previewUrl}
                  label={imageUpload.label}
                  hint={imageUpload.hint}
                  chooseLabel={imageUpload.chooseLabel}
                  uploadingLabel={imageUpload.uploadingLabel}
                  removeLabel={imageUpload.removeLabel}
                  previewAlt={imageUpload.previewAlt}
                  error={imageUpload.error}
                  isUploading={imageUpload.isUploading}
                  disabled={!canManage}
                  onFileSelect={imageUpload.onFileSelect}
                  onRemove={imageUpload.onRemove}
                />
              ) : null}
            </SheetBody>
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {cancelLabel}
              </Button>
              {canManage ? (
                <Button type="submit" disabled={isSaving}>
                  {submitLabel}
                </Button>
              ) : null}
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
