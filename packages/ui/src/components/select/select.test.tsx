import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.js';

function OrderTypeSelect({ onValueChange }: { onValueChange: (value: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Order type">
        <SelectValue placeholder="Choose" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dine-in">Dine-in</SelectItem>
        <SelectItem value="takeaway">Takeaway</SelectItem>
        <SelectItem value="delivery">Delivery</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe('Select keyboard', () => {
  it('opens with Enter, moves with arrows and selects with Enter', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<OrderTypeSelect onValueChange={onValueChange} />);

    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Order type' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('takeaway');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Takeaway');
  });

  it('closes with Escape without changing the value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<OrderTypeSelect onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveFocus();
  });
});
