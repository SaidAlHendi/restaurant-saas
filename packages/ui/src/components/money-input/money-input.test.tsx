import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MoneyInput } from './money-input.js';

function Harness({
  initial = null,
  currency = 'SAR',
  onValue = vi.fn(),
}: {
  initial?: number | null;
  currency?: string;
  onValue?: (value: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <MoneyInput
      aria-label="Price"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValue(next);
      }}
      currency={currency}
      locale="en"
    />
  );
}

describe('MoneyInput', () => {
  it('reports minor units while typing and formats on blur', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: 'Price' });

    await user.type(input, '1234.5');
    expect(onValue).toHaveBeenLastCalledWith(123450);

    await user.tab();
    expect(input).toHaveValue('1,234.50');
  });

  it('shows plain text when focused again', async () => {
    const user = userEvent.setup();
    render(<Harness initial={123450} />);
    const input = screen.getByRole('textbox', { name: 'Price' });
    expect(input).toHaveValue('1,234.50');
    await user.click(input);
    expect(input).toHaveValue('1234.50');
  });

  it('uses 3 decimals for KWD and blocks a 4th', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness currency="KWD" onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: 'Price' });
    await user.type(input, '1.2505');
    expect(input).toHaveValue('1.250');
    expect(onValue).toHaveBeenLastCalledWith(1250);
  });

  it('accepts Arabic digits and ignores letters', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: 'Price' });
    await user.type(input, '١٢x٫٥');
    expect(input).toHaveValue('١٢٫٥');
    expect(onValue).toHaveBeenLastCalledWith(1250);
  });

  it('clears to null', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={500} onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: 'Price' });
    await user.clear(input);
    expect(onValue).toHaveBeenLastCalledWith(null);
  });
});
