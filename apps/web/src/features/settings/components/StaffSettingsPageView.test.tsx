import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StaffSettingsPageView } from './StaffSettingsPageView.js';
import type { StaffSettingsPageViewModel } from '../hooks/use-staff-settings-page.js';
import { staffRowActions } from '../staff-row-actions.utils.js';

function row(
  overrides: Partial<StaffSettingsPageViewModel['rows'][number]> &
    Pick<StaffSettingsPageViewModel['rows'][number], 'id' | 'name' | 'emailLabel' | 'statusLabel'>,
): StaffSettingsPageViewModel['rows'][number] {
  const actions = staffRowActions({
    actorMembershipId: 'owner',
    actorRoleKey: 'owner',
    hasStaffManage: true,
    activeOwnerCount: 2,
    target: {
      id: overrides.id,
      roleKey: 'cashier',
      status: 'active',
      isSelf: false,
      hasPin: false,
    },
  });
  return {
    roleLabel: 'Cashier',
    statusTone: 'secondary',
    pinLabel: 'No PIN',
    actions,
    onEdit: null,
    onSetPin: null,
    onRemovePin: null,
    onDisable: null,
    onEnable: null,
    onRegenerateInvite: null,
    onRevokeInvite: null,
    ...overrides,
  };
}

function minimalStaffVm(overrides: Partial<StaffSettingsPageViewModel> = {}): StaffSettingsPageViewModel {
  const managerInviteRoles = [
    {
      value: 'cashier' as const,
      label: 'Cashier',
      description: 'POS',
    },
    {
      value: 'kitchen' as const,
      label: 'Kitchen',
      description: 'KDS',
    },
  ];
  return {
    redirectTo: null,
    isLoading: false,
    isError: false,
    canAddStaff: true,
    branchOptions: [{ id: 'b1', name: 'Main' }],
    inviteRoleOptions: managerInviteRoles,
    editRoleOptions: managerInviteRoles,
    pinOnlyRoleOptions: managerInviteRoles,
    inviteOpen: false,
    onInviteOpenChange: () => {},
    pinOnlyOpen: false,
    onPinOnlyOpenChange: () => {},
    inviteEmail: '',
    onInviteEmailChange: () => {},
    inviteEmailError: null,
    inviteRole: 'cashier',
    onInviteRoleChange: () => {},
    inviteScope: { allBranches: true, branchIds: [] },
    onInviteAllBranchesChange: () => {},
    onInviteBranchToggle: () => {},
    inviteScopeError: null,
    inviteSubmitting: false,
    onSubmitInvite: () => {},
    pinOnlyName: '',
    onPinOnlyNameChange: () => {},
    pinOnlyNameError: null,
    pinOnlyRole: 'cashier',
    onPinOnlyRoleChange: () => {},
    pinOnlyScope: { allBranches: true, branchIds: [] },
    onPinOnlyAllBranchesChange: () => {},
    onPinOnlyBranchToggle: () => {},
    pinOnlyScopeError: null,
    pinOnlyPin: '',
    onPinOnlyPinChange: () => {},
    pinOnlyPinConfirm: '',
    onPinOnlyPinConfirmChange: () => {},
    pinOnlyPinError: null,
    pinOnlySubmitting: false,
    onSubmitPinOnly: () => {},
    editOpen: false,
    onEditOpenChange: () => {},
    editRole: 'cashier',
    onEditRoleChange: () => {},
    editScope: { allBranches: true, branchIds: [] },
    onEditAllBranchesChange: () => {},
    onEditBranchToggle: () => {},
    editScopeError: null,
    editSubmitting: false,
    onSubmitEdit: () => {},
    pinDialogOpen: false,
    onPinDialogOpenChange: () => {},
    pinDialogMemberName: '',
    pinValue: '',
    onPinValueChange: () => {},
    pinConfirm: '',
    onPinConfirmChange: () => {},
    pinFormError: null,
    pinSubmitting: false,
    onSubmitPinDialog: () => {},
    removePinOpen: false,
    onRemovePinOpenChange: () => {},
    removePinMemberName: '',
    removePinSubmitting: false,
    onConfirmRemovePin: () => {},
    disableConfirmOpen: false,
    onDisableConfirmOpenChange: () => {},
    disableMemberName: '',
    onConfirmDisable: () => {},
    revokeConfirmOpen: false,
    onRevokeConfirmOpenChange: () => {},
    revokeMemberName: '',
    onConfirmRevoke: () => {},
    inviteLinkOpen: false,
    onInviteLinkOpenChange: () => {},
    inviteLinkUrl: '',
    inviteLinkCopyLabel: null,
    onCopyInviteLink: () => {},
    rows: [
      row({
        id: 'invited',
        name: 'Invited User',
        emailLabel: 'Pending invite',
        statusLabel: 'Invited',
      }),
      row({
        id: 'pin-only',
        name: 'PIN User',
        emailLabel: 'PIN only',
        statusLabel: 'Active',
        pinLabel: 'PIN set',
      }),
      row({
        id: 'disabled',
        name: 'Former Staff',
        emailLabel: 'staff@example.com',
        statusLabel: 'Disabled',
        statusTone: 'destructive',
      }),
    ],
    labels: {
      title: 'Staff',
      description: 'Team',
      addStaff: 'Add staff',
      addStaffInvite: 'Invite by email',
      addStaffPinOnly: 'PIN only',
      loadError: 'Error',
      loading: 'Loading',
      empty: 'Empty',
      columnName: 'Name',
      columnEmail: 'Email',
      columnRole: 'Role',
      columnStatus: 'Status',
      columnPin: 'PIN',
      actions: 'Actions',
      edit: 'Edit',
      setPin: 'Set PIN',
      removePin: 'Remove PIN',
      disable: 'Disable',
      enable: 'Enable',
      regenerateInvite: 'Regenerate',
      revokeInvite: 'Revoke',
      inviteDialogTitle: 'Invite',
      pinOnlyDialogTitle: 'PIN only',
      editDialogTitle: 'Edit',
      pinDialogTitle: 'Set PIN',
      removePinDialogTitle: 'Remove PIN',
      disableDialogTitle: 'Disable',
      disableDialogDescription: 'Disable',
      revokeDialogTitle: 'Revoke',
      revokeDialogDescription: 'Revoke',
      inviteLinkDialogTitle: 'Invitation link',
      inviteLinkValidFor: 'Valid 7 days',
      inviteLinkCopy: 'Copy link',
      inviteEmail: 'Email',
      inviteRole: 'Role',
      inviteSubmit: 'Send',
      pinOnlyName: 'Name',
      pinOnlySubmit: 'Create',
      pinLabel: 'PIN',
      pinConfirmLabel: 'Confirm PIN',
      allBranches: 'All branches',
      branches: 'Branches',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
    },
    ...overrides,
  };
}

describe('StaffSettingsPageView', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders invited, PIN-only and disabled staff rows', () => {
    render(<StaffSettingsPageView {...minimalStaffVm()} />);
    expect(screen.getByText('Invited User')).toBeInTheDocument();
    expect(screen.getByText('Pending invite')).toBeInTheDocument();
    expect(screen.getByText('PIN User')).toBeInTheDocument();
    expect(screen.getByText('PIN only')).toBeInTheDocument();
    expect(screen.getByText('Former Staff')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('manager invite dialog lists only cashier and kitchen roles', () => {
    render(
      <StaffSettingsPageView
        {...minimalStaffVm({
          inviteOpen: true,
          rows: [],
          inviteRoleOptions: [
            { value: 'cashier', label: 'Cashier', description: 'POS' },
            { value: 'kitchen', label: 'Kitchen', description: 'KDS' },
          ],
        })}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Invite' });
    expect(within(dialog).getByText('POS')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'Cashier' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: 'Kitchen' })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: 'Owner' })).not.toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: 'Manager' })).not.toBeInTheDocument();
  });

  it('shows invite link dialog with URL when clipboard rejects', () => {
    const writeText = vi.fn((_text: string) => Promise.reject(new Error('denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const onCopyInviteLink = vi.fn(() => {
      void writeText('https://app.test/invite/abc').catch(() => undefined);
    });
    render(
      <StaffSettingsPageView
        {...minimalStaffVm({
          inviteLinkOpen: true,
          inviteLinkUrl: 'https://app.test/invite/abc',
          onCopyInviteLink,
        })}
      />,
    );
    const input = screen.getByDisplayValue('https://app.test/invite/abc');
    expect(input).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopyInviteLink).toHaveBeenCalled();
  });
});
