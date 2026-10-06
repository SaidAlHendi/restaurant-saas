import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type BaseSyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Demo schema for /dev/ui. Real forms take their schema from @app/shared.
// Messages are keys; the view translates them with FormMessage's formatMessage.
const productSchema = z.object({
  name: z.string().trim().min(2, 'errors.nameTooShort'),
  price: z
    .number()
    .int()
    .positive('errors.pricePositive')
    .nullable()
    .refine((value) => value !== null, 'errors.priceRequired'),
  quantity: z.number().int().min(1).max(20).nullable(),
  category: z.string().min(1, 'errors.categoryRequired'),
  available: z.boolean(),
});

export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormValues = z.output<typeof productSchema>;

const defaults: ProductFormInput = {
  name: '',
  price: null,
  quantity: 1,
  category: '',
  available: true,
};

export function useProductFormDemo() {
  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaults,
  });
  const [submitted, setSubmitted] = useState<ProductFormValues | null>(null);

  const onSubmit = form.handleSubmit((values) => {
    setSubmitted(values);
  });

  const onReset = () => {
    form.reset(defaults);
    setSubmitted(null);
  };

  return {
    form,
    onSubmit: (event: BaseSyntheticEvent) => {
      void onSubmit(event);
    },
    onReset,
    submittedJson: submitted ? JSON.stringify(submitted, null, 2) : null,
  };
}

export type ProductFormDemo = ReturnType<typeof useProductFormDemo>;

/** Local state for the standalone MoneyInput / NumberInput examples. */
export function useInputsDemo() {
  const [sar, setSar] = useState<number | null>(1850);
  const [kwd, setKwd] = useState<number | null>(1250);
  const [touch, setTouch] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | null>(1);
  const [touchQuantity, setTouchQuantity] = useState<number | null>(2);
  return {
    sar: { value: sar, onValueChange: setSar },
    kwd: { value: kwd, onValueChange: setKwd },
    touch: { value: touch, onValueChange: setTouch },
    quantity: { value: quantity, onValueChange: setQuantity },
    touchQuantity: { value: touchQuantity, onValueChange: setTouchQuantity },
  };
}

export type InputsDemo = ReturnType<typeof useInputsDemo>;
