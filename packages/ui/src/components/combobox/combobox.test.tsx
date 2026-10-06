import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Combobox } from './combobox.js';

const options = [
  { value: 'shawarma', label: 'Chicken shawarma', keywords: ['شاورما'] },
  { value: 'falafel', label: 'Falafel wrap' },
  { value: 'hummus', label: 'Hummus plate' },
];

function renderCombobox(onValueChange = vi.fn()) {
  render(
    <Combobox
      options={options}
      onValueChange={onValueChange}
      placeholder="Choose a product"
      searchPlaceholder="Search products"
      emptyText="No product found"
    />,
  );
  return onValueChange;
}

describe('Combobox keyboard', () => {
  it('filters by typing and selects with Enter', async () => {
    const user = userEvent.setup();
    const onValueChange = renderCombobox();

    await user.tab();
    await user.keyboard('{Enter}');
    const search = await screen.findByPlaceholderText('Search products');
    expect(search).toHaveFocus();

    await user.keyboard('fal');
    expect(screen.getByRole('option', { name: /Falafel wrap/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Hummus plate/ })).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('falafel');
    expect(screen.getByRole('combobox')).toHaveTextContent('Falafel wrap');
    expect(screen.queryByPlaceholderText('Search products')).not.toBeInTheDocument();
  });

  it('moves with arrow keys and matches keywords in another language', async () => {
    const user = userEvent.setup();
    const onValueChange = renderCombobox();

    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByPlaceholderText('Search products');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('falafel');

    await user.keyboard('{Enter}');
    await screen.findByPlaceholderText('Search products');
    await user.keyboard('شاورما{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('shawarma');
  });

  it('shows the empty text and closes with Escape', async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByPlaceholderText('Search products');
    await user.keyboard('zzz');
    expect(screen.getByText('No product found')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText('Search products')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveFocus();
  });
});
