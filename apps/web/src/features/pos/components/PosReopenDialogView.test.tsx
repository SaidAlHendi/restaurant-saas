import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PosReopenViewModel } from '../hooks/use-pos-reopen.js';
import { PosReopenDialogView } from './PosReopenDialogView.js';

function vm(overrides: Partial<PosReopenViewModel> = {}): PosReopenViewModel {
  return {
    open: true,
    openDialog: vi.fn(),
    close: vi.fn(),
    reason: '',
    onReasonChange: vi.fn(),
    confirm: vi.fn(() => Promise.resolve()),
    submitting: false,
    reasonMax: 200,
    labels: {
      action: 'Reopen order',
      title: 'Reopen this order?',
      body: 'The order goes back to Ready.',
      reason: 'Reason (optional)',
      confirm: 'Reopen',
      cancel: 'Cancel',
    },
    ...overrides,
  };
}

afterEach(cleanup);

describe('PosReopenDialogView', () => {
  it('explains the effect, takes an optional reason and confirms', () => {
    const model = vm();
    render(<PosReopenDialogView {...model} />);
    expect(screen.getByText('The order goes back to Ready.')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Reason (optional)'), { target: { value: 'oops' } });
    expect(model.onReasonChange).toHaveBeenCalledWith('oops');
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(model.confirm).toHaveBeenCalled();
  });

  it('can be confirmed without a reason and locks while submitting', () => {
    render(<PosReopenDialogView {...vm({ submitting: true })} />);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reopen' }).disabled).toBe(true);
  });

  it('renders nothing when closed', () => {
    render(<PosReopenDialogView {...vm({ open: false })} />);
    expect(screen.queryByText('Reopen this order?')).toBeNull();
  });
});
