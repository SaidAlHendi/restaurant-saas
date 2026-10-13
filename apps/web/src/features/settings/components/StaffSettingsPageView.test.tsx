import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

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
    onDisable: null,
    onEnable: null,
    onRegenerateInvite: null,
    onRevokeInvite: null,
    ...overrides,
  };
}

function minimalStaffVm(overrides: Partial<StaffSettingsPageViewModel> = {}): StaffSettingsPageViewModel {
  return {
    isLoading: false,
    isError: false,
    canAddStaff: true,
    inviteOpen: false,
    onInviteOpenChange: () => {},
    inviteEmail: '',
    onInviteEmailChange: () => {},
    inviteRole: 'cashier',
    onInviteRoleChange: () => {},
    inviteSubmitting: false,
    onSubmitInvite: () => {},
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
      loadError: 'Error',
      loading: 'Loading',
      empty: 'Empty',
      columnName: 'Name',
      columnEmail: 'Email',
      columnRole: 'Role',
      columnStatus: 'Status',
      columnPin: 'PIN',
      actions: 'Actions',
      disable: 'Disable',
      enable: 'Enable',
      regenerateInvite: 'Regenerate',
      revokeInvite: 'Revoke',
      inviteDialogTitle: 'Invite',
      inviteEmail: 'Email',
      inviteRole: 'Role',
      inviteSubmit: 'Send',
      cancel: 'Cancel',
      roleCashier: 'Cashier',
      roleKitchen: 'Kitchen',
      roleManager: 'Manager',
      roleOwner: 'Owner',
    },
    ...overrides,
  };
}

describe('StaffSettingsPageView', () => {
  afterEach(() => {
    cleanup();
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
});
