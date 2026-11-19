import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DevicesPageViewModel } from '../hooks/use-devices-page.js';
import { DevicesPageView } from './DevicesPageView.js';

function vm(overrides: Partial<DevicesPageViewModel> = {}): DevicesPageViewModel {
  return {
    redirectTo: null,
    isLoading: false,
    isError: false,
    rows: [
      {
        id: 'd1',
        name: 'Front counter',
        branchName: 'Main',
        statusLabel: 'Linked',
        statusTone: 'default',
        lastUsedLabel: 'Never',
        onRevoke: vi.fn(),
      },
    ],
    branchOptions: [{ id: 'b1', name: 'Main' }],
    createOpen: false,
    onCreateOpenChange: vi.fn(),
    openCreate: vi.fn(),
    name: '',
    onNameChange: vi.fn(),
    nameError: null,
    branchId: 'b1',
    onBranchChange: vi.fn(),
    creating: false,
    onSubmitCreate: vi.fn(),
    pairingCode: null,
    revokeOpen: false,
    revokeName: '',
    onRevokeOpenChange: vi.fn(),
    revoking: false,
    onConfirmRevoke: vi.fn(),
    labels: {
      title: 'Cashier devices',
      description: 'desc',
      add: 'Link a device',
      loading: 'Loading',
      loadError: 'Load error',
      empty: 'No devices',
      columnName: 'Device',
      columnBranch: 'Branch',
      columnStatus: 'Status',
      columnLastUsed: 'Last used',
      actions: 'Actions',
      remove: 'Remove',
      createTitle: 'Link a device',
      createDescription: 'create desc',
      nameLabel: 'Device name',
      branchLabel: 'Branch',
      createSubmit: 'Create code',
      codeTitle: 'Enter this code on the device',
      codeHint: 'Valid for 15 minutes',
      codeSteps: 'steps',
      done: 'Done',
      cancel: 'Cancel',
      close: 'Close',
      removeTitle: 'Remove this device?',
      removeDescription: 'Device:',
    },
    ...overrides,
  };
}

describe('DevicesPageView', () => {
  it('lists devices and opens the link dialog', () => {
    const props = vm();
    render(<DevicesPageView {...props} />);
    expect(screen.getByText('Front counter')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link a device' }));
    expect(props.openCreate).toHaveBeenCalled();
  });

  it('shows the one-time code, split for reading', () => {
    render(<DevicesPageView {...vm({ createOpen: true, pairingCode: 'ABCD2345' })} />);
    expect(screen.getByTestId('pairing-code')).toHaveTextContent('ABCD 2345');
  });

  it('shows an empty state', () => {
    render(<DevicesPageView {...vm({ rows: [] })} />);
    expect(screen.getByText('No devices')).toBeInTheDocument();
  });
});
