import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { canInviteRole, type StaffListItem, type SystemRoleKey } from '@app/shared';
import { toast } from '@app/ui';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan, selectSessionRole } from '../../session/session.selectors.js';
import { showMenuApiError } from '../../menu/show-menu-api-error.js';
import { staffRowActions } from '../staff-row-actions.utils.js';
import {
  useCreateStaffInviteMutation,
  useListStaffQuery,
  usePatchStaffMembershipMutation,
  useRegenerateStaffInviteMutation,
  useRevokeStaffInviteMutation,
} from '../settings.api.js';

export type StaffTableRow = {
  id: string;
  name: string;
  emailLabel: string;
  roleLabel: string;
  statusLabel: string;
  statusTone: 'default' | 'secondary' | 'destructive' | 'outline';
  pinLabel: string;
  actions: ReturnType<typeof staffRowActions>;
  onDisable: (() => void) | null;
  onEnable: (() => void) | null;
  onRegenerateInvite: (() => void) | null;
  onRevokeInvite: (() => void) | null;
};

export function useStaffSettingsPage() {
  const { t } = useTranslation();
  const role = useAppSelector(selectSessionRole);
  const hasStaffManage = useAppSelector(selectCan('staff.manage'));
  const { data, isLoading, isError } = useListStaffQuery(undefined);
  const [patchStaff] = usePatchStaffMembershipMutation();
  const [regenerateInvite] = useRegenerateStaffInviteMutation();
  const [revokeInvite] = useRevokeStaffInviteMutation();
  const [createInvite, createInviteState] = useCreateStaffInviteMutation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<SystemRoleKey>('cashier');

  const actorRoleKey = (role?.key ?? 'cashier') as SystemRoleKey;
  const actorMembershipId = useMemo(
    () => data?.items.find((m) => m.isSelf)?.id ?? '',
    [data?.items],
  );

  const activeOwnerCount = useMemo(() => {
    return (data?.items ?? []).filter((m) => m.roleKey === 'owner' && m.status === 'active').length;
  }, [data?.items]);

  const roleLabel = useCallback(
    (key: SystemRoleKey) => t(`settings.staff.roles.${key}`),
    [t],
  );

  const statusMeta = useCallback(
    (status: StaffListItem['status']) => {
      if (status === 'invited') {
        return { label: t('settings.staff.status.invited'), tone: 'secondary' as const };
      }
      if (status === 'disabled') {
        return { label: t('settings.staff.status.disabled'), tone: 'destructive' as const };
      }
      return { label: t('settings.staff.status.active'), tone: 'default' as const };
    },
    [t],
  );

  const patchStatus = useCallback(
    async (membershipId: string, status: 'active' | 'disabled') => {
      const result = await patchStaff({ membershipId, body: { status } });
      if ('error' in result) {
        showMenuApiError(result.error, t);
        return;
      }
      toast.success(t('settings.staff.saved'));
    },
    [patchStaff, t],
  );

  const rows: StaffTableRow[] = useMemo(() => {
    return (data?.items ?? []).map((member) => {
      const actions = staffRowActions({
        actorMembershipId,
        actorRoleKey,
        hasStaffManage,
        activeOwnerCount,
        target: member,
      });
      const meta = statusMeta(member.status);
      const emailLabel =
        member.email ??
        (member.status === 'invited' ? t('settings.staff.pendingEmail') : t('settings.staff.pinOnly'));
      return {
        id: member.id,
        name: member.name,
        emailLabel,
        roleLabel: roleLabel(member.roleKey),
        statusLabel: meta.label,
        statusTone: meta.tone,
        pinLabel: member.hasPin ? t('settings.staff.pinSet') : t('settings.staff.pinNone'),
        actions,
        onDisable: actions.canDisable
          ? () => {
              void patchStatus(member.id, 'disabled');
            }
          : null,
        onEnable: actions.canEnable
          ? () => {
              void patchStatus(member.id, 'active');
            }
          : null,
        onRegenerateInvite: actions.canRegenerateInvite
          ? () => {
              void regenerateInvite(member.id).then((result) => {
                if ('error' in result) {
                  showMenuApiError(result.error, t);
                  return;
                }
                void navigator.clipboard.writeText(result.data.inviteUrl).then(
                  () => {
                    toast.success(t('settings.staff.inviteCopied'));
                  },
                  () => {
                    toast.success(t('settings.staff.inviteRegenerated'));
                  },
                );
              });
            }
          : null,
        onRevokeInvite: actions.canRevokeInvite
          ? () => {
              void revokeInvite(member.id).then((result) => {
                if ('error' in result) {
                  showMenuApiError(result.error, t);
                  return;
                }
                toast.success(t('settings.staff.inviteRevoked'));
              });
            }
          : null,
      };
    });
  }, [
    activeOwnerCount,
    actorMembershipId,
    actorRoleKey,
    data?.items,
    hasStaffManage,
    patchStatus,
    regenerateInvite,
    revokeInvite,
    roleLabel,
    statusMeta,
    t,
  ]);

  const canAddStaff = hasStaffManage && canInviteRole(actorRoleKey, 'cashier');

  const onSubmitInvite = useCallback(async () => {
    const result = await createInvite({
      email: inviteEmail.trim(),
      roleKey: inviteRole,
      allBranches: true,
      branchIds: [],
    });
    if ('error' in result) {
      showMenuApiError(result.error, t);
      return;
    }
    setInviteOpen(false);
    setInviteEmail('');
    void navigator.clipboard.writeText(result.data.inviteUrl).then(
      () => {
        toast.success(t('settings.staff.inviteCopied'));
      },
      () => {
        toast.success(t('settings.staff.inviteCreated'));
      },
    );
  }, [createInvite, inviteEmail, inviteRole, t]);

  return {
    isLoading,
    isError,
    rows,
    canAddStaff,
    inviteOpen,
    onInviteOpenChange: setInviteOpen,
    inviteEmail,
    onInviteEmailChange: setInviteEmail,
    inviteRole,
    onInviteRoleChange: (value: string) => {
      setInviteRole(value as SystemRoleKey);
    },
    inviteSubmitting: createInviteState.isLoading,
    onSubmitInvite: () => {
      void onSubmitInvite();
    },
    labels: {
      title: t('settings.staff.title'),
      description: t('settings.staff.description'),
      addStaff: t('settings.staff.addStaff'),
      loadError: t('settings.staff.loadError'),
      loading: t('common.loading'),
      empty: t('settings.staff.empty'),
      columnName: t('settings.staff.columnName'),
      columnEmail: t('settings.staff.columnEmail'),
      columnRole: t('settings.staff.columnRole'),
      columnStatus: t('settings.staff.columnStatus'),
      columnPin: t('settings.staff.columnPin'),
      actions: t('settings.staff.actions'),
      disable: t('settings.staff.disable'),
      enable: t('settings.staff.enable'),
      regenerateInvite: t('settings.staff.regenerateInvite'),
      revokeInvite: t('settings.staff.revokeInvite'),
      inviteDialogTitle: t('settings.staff.inviteDialogTitle'),
      inviteEmail: t('settings.staff.inviteEmail'),
      inviteRole: t('settings.staff.inviteRole'),
      inviteSubmit: t('settings.staff.inviteSubmit'),
      cancel: t('common.cancel'),
      roleCashier: t('settings.staff.roles.cashier'),
      roleKitchen: t('settings.staff.roles.kitchen'),
      roleManager: t('settings.staff.roles.manager'),
      roleOwner: t('settings.staff.roles.owner'),
    },
  };
}

export type StaffSettingsPageViewModel = ReturnType<typeof useStaffSettingsPage>;
