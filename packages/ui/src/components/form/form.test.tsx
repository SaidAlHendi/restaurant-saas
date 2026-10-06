import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Button } from '../button/button.js';
import { Input } from '../input/input.js';
import { MoneyInput } from '../money-input/money-input.js';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form.js';

const schema = z.object({
  name: z.string().min(2, 'errors.nameTooShort'),
  price: z
    .number()
    .int()
    .positive('errors.pricePositive')
    .nullable()
    .refine((value) => value !== null, 'errors.priceRequired'),
});
type FormInput = z.input<typeof schema>;
type Values = z.output<typeof schema>;

const messages: Record<string, string> = {
  'errors.nameTooShort': 'Name is too short',
  'errors.priceRequired': 'Enter a price',
  'errors.pricePositive': 'Price must be greater than zero',
};

function ProductForm({ onSubmit }: { onSubmit: (values: Values) => void }) {
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', price: null },
  });
  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Shown on the menu</FormDescription>
              <FormMessage formatMessage={(key) => messages[key] ?? key} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <MoneyInput
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  currency="SAR"
                  locale="en"
                />
              </FormControl>
              <FormMessage formatMessage={(key) => messages[key] ?? key} />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}

describe('Form', () => {
  it('shows translated zod errors and marks fields invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const name = screen.getByLabelText('Name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByText('Name is too short')).toBeInTheDocument();
    expect(screen.getByText('Enter a price')).toBeInTheDocument();
    expect(name.getAttribute('aria-describedby')).toContain(
      screen.getByText('Name is too short').id,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits minor units from MoneyInput', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Shawarma');
    await user.type(screen.getByLabelText('Price'), '18.5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Shawarma', price: 1850 }, expect.anything());
  });
});
