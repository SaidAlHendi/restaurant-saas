import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StaffPermissionsDialogView } from './StaffPermissionsDialogView.js';
import type { StaffPermissionsDialogViewModel } from '../hooks/use-staff-permissions-dialog.js';

afterEach(cleanup);

function vm(overrides: Partial<StaffPermissionsDialogViewModel> = {}): StaffPermissionsDialogViewModel {
  return {
    isLoading: false,
    isError: false,
    items: [
      { key: 'tables.rotate_qr', label: 'Regenerate table QR codes', enabled: false, overridden: false },
      { key: 'menu.manage', label: 'Manage menu', enabled: true, overridden: true },
    ],
    hasOverrides: true,
    submitting: false,
    onToggle: () => {},
    onReset: () => {},
    onSave: () => {},
    labels: {
      title: 'Permissions for Sam',
      description: 'desc',
      overridden: 'Custom',
      reset: 'Reset to role',
      loadError: 'load error',
      loading: 'Loading',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
    },
    ...overrides,
  };
}

describe('StaffPermissionsDialogView', () => {
  it('lists permissions, marks custom ones and reports toggles', () => {
    const onToggle = vi.fn();
    render(<StaffPermissionsDialogView {...vm({ onToggle })} open onOpenChange={() => {}} />);
    expect(screen.getByText('Permissions for Sam')).toBeTruthy();
    expect(screen.getByText('Custom')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: /Regenerate table QR codes/ }));
    expect(onToggle).toHaveBeenCalledWith('tables.rotate_qr', true);
  });

  it('disables reset when there are no overrides and save while loading', () => {
    render(
      <StaffPermissionsDialogView
        {...vm({ hasOverrides: false, isLoading: true })}
        open
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reset to role' }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled).toBe(true);
  });
});
