import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '../confirm-dialog/confirm-dialog.js';
import { Button } from '../button/button.js';
import { Input } from '../input/input.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from './dialog.js';

describe('Dialog keyboard', () => {
  it('opens with Enter, traps focus, closes with Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Edit product</Button>
        </DialogTrigger>
        <DialogContent closeLabel="Close">
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>Change the name and price.</DialogDescription>
          <Input aria-label="Name" />
          <DialogFooter>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Edit product' });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    // Tab cycles inside the dialog: Name -> Save -> Close -> back to Name.
    for (let i = 0; i < 4; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe('ConfirmDialog', () => {
  it('is an alertdialog; confirm calls onConfirm, Escape cancels', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Cancel order #42?"
        description="The kitchen will be told to stop."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        variant="destructive"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    // Radix focuses Cancel first so Enter cannot destroy anything by accident.
    expect(screen.getByRole('button', { name: 'Keep order' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Cancel order' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cannot be dismissed while confirming', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Cancel order #42?"
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onConfirm={vi.fn()}
        isConfirming
      />,
    );
    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeDisabled();
  });
});
