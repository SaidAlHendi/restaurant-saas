import { useId, type ComponentProps, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  FormProvider,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import { FormFieldContext, FormItemContext, useFormField } from '../../hooks/use-form-field.js';
import { cn } from '../../lib/cn.js';
import { Label } from '../label/label.js';

/** Wrap a form: `const form = useForm({ resolver: zodResolver(schema) }); <Form {...form}>`. */
export const Form = FormProvider;

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: ControllerProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function FormItem({ className, ...props }: ComponentProps<'div'>) {
  const id = useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('grid content-start gap-2', className)} {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      data-slot="form-label"
      data-error={Boolean(error)}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

/** Passes id, aria-invalid and aria-describedby to the input inside it. */
export function FormControl(props: ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={Boolean(error)}
      {...props}
    />
  );
}

export function FormDescription({ className, ...props }: ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export interface FormMessageProps extends ComponentProps<'p'> {
  /**
   * Turns the schema's error message into user text. Use it when schema messages are
   * translation keys: `formatMessage={(key) => t(key)}`.
   */
  formatMessage?: (message: string) => ReactNode;
}

export function FormMessage({ className, children, formatMessage, ...props }: FormMessageProps) {
  const { error, formMessageId } = useFormField();
  const message = error?.message;
  const body = message ? (formatMessage ? formatMessage(message) : message) : children;
  if (!body) return null;
  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      role={error ? 'alert' : undefined}
      className={cn('text-sm text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
}
