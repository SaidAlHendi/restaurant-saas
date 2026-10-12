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
  /** What the field is ("Name", "Description"); shown above the language tabs. */
  label?: string;
}

export function LocalizedFieldsView<T extends FieldValues>({
  control,
  namePrefix,
  locales,
  labels,
  tabLabel,
  requiredLocale,
  label,
}: LocalizedFieldsViewProps<T>) {
  const fieldLabel = (locale: string) => {
    const language = labels[locale] ?? locale;
    return label ? `${label} (${language})` : language;
  };
  if (locales.length === 1) {
    const locale = locales[0] ?? 'en';
    const fieldName = `${namePrefix}.${locale}` as FieldPath<T>;
    return (
      <FormField
        control={control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{fieldLabel(locale)}</FormLabel>
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
    <Tabs defaultValue={locales[0]} className="gap-2">
      {label ? <p className="text-sm font-medium">{label}</p> : null}
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
                  <FormLabel className={label ? 'sr-only' : undefined}>
                    {fieldLabel(locale)}
                  </FormLabel>
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
