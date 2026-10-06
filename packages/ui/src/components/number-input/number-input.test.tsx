import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { NumberInput } from './number-input.js';

function Harness({ initial = 1 }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <NumberInput
      aria-label="Quantity"
      value={value}
      onValueChange={setValue}
      min={1}
      max={5}
      decrementLabel="Decrease"
      incrementLabel="Increase"
    />
  );
}

describe('NumberInput', () => {
  it('steps with the buttons and stops at the bounds', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('spinbutton', { name: 'Quantity' });
    const minus = screen.getByRole('button', { name: 'Decrease' });
    const plus = screen.getByRole('button', { name: 'Increase' });

    expect(minus).toBeDisabled();
    await user.click(plus);
    await user.click(plus);
    expect(input).toHaveValue('3');
    for (let i = 0; i < 5; i++) await user.click(plus);
    expect(input).toHaveValue('5');
    expect(plus).toBeDisabled();
  });

  it('steps with ArrowUp/ArrowDown', async () => {
    const user = userEvent.setup();
    render(<Harness initial={2} />);
    const input = screen.getByRole('spinbutton', { name: 'Quantity' });
    await user.click(input);
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');
    expect(input).toHaveValue('3');
    expect(input).toHaveAttribute('aria-valuenow', '3');
  });

  it('clamps typed values on blur and accepts Arabic digits', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('spinbutton', { name: 'Quantity' });
    await user.clear(input);
    await user.type(input, '٩');
    await user.tab();
    expect(input).toHaveValue('5');
  });
});
