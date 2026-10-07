import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@app/ui';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

export interface LocalizedFieldsViewProps<T extends FieldValues> {
  control: Control<T>;
  /** Field path prefix, e.g. `name` or `description`. */
  namePrefix: FieldPath<T>;
  locales: string[];
  labels: Record<string, string>;
  tabLabel: (locale: string) => string;
  requiredLocale?: string;
}

export function LocalizedFieldsView<T extends FieldValues>({
  control,
  namePrefix,
  locales,
  labels,
  tabLabel,
  requiredLocale,
}: LocalizedFieldsViewProps<T>) {
  if (locales.length === 1) {
    const locale = locales[0] ?? 'en';
    const fieldName = `${namePrefix}.${locale}` as FieldPath<T>;
    return (
      <FormField
        control={control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{labels[locale] ?? locale}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <Tabs defaultValue={locales[0]}>
      <TabsList className="w-full">
        {locales.map((locale) => (
          <TabsTrigger key={locale} value={locale} className="flex-1">
            {tabLabel(locale)}
            {requiredLocale === locale ? ' *' : ''}
          </TabsTrigger>
        ))}
      </TabsList>
      {locales.map((locale) => {
        const fieldName = `${namePrefix}.${locale}` as FieldPath<T>;
        return (
          <TabsContent key={locale} value={locale}>
            <FormField
              control={control}
              name={fieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels[locale] ?? locale}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
