import {
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
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
} from '@app/ui';
import type { UseFormReturn } from 'react-hook-form';

import type { ModifierGroup } from '@app/shared';

import type { ProductFormOutput, ProductFormValues } from '../hooks/use-product-form.js';
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
  imageUpload,
}: ProductFormSheetViewProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="flex flex-col gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{categoryLabel}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canManage}>
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
              locales={locales}
              labels={localeLabels}
              tabLabel={tabLabel}
              requiredLocale={defaultLocale}
            />
            <LocalizedFieldsView<ProductFormValues>
              control={form.control}
              namePrefix="description"
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
            <SheetFooter className="gap-2 pt-2">
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
