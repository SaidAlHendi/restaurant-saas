import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { StaffListItem, SystemRoleKey } from '@app/shared';
import { toast } from '@app/ui';

import { showApiError } from '../../../lib/show-api-error.js';
import { useAppSelector } from '../../../app/hooks.js';
import { selectCan, selectSessionBranches, selectSessionRole } from '../../session/session.selectors.js';
import { validateBranchScope } from '../staff-branches-form.utils.js';
import { validatePinForm } from '../staff-pin-form.utils.js';
import {
  assignableRoleKeys,
  invitableRoleKeys,
  parseSystemRoleKey,
  asPinOnlyRoleKey,
  pinOnlyInvitableRoleKeys,
} from '../staff-role-options.utils.js';
import { staffRowActions } from '../staff-row-actions.utils.js';
import {
  useCreatePinOnlyStaffMutation,
  useCreateStaffInviteMutation,
  useDeleteStaffPinMutation,
  useListStaffQuery,
  usePatchStaffMembershipMutation,
  usePutStaffPinMutation,
  useRegenerateStaffInviteMutation,
  useRevokeStaffInviteMutation,
} from '../settings.api.js';
import { useSettingsPageAccess } from './use-settings-page-access.js';

export type StaffRoleOption = {
  value: SystemRoleKey;
  label: string;
  description: string;
};

export type StaffBranchOption = {
  id: string;
  name: string;
};

export type StaffTableRow = {
  id: string;
  name: string;
  emailLabel: string;
  roleLabel: string;
  statusLabel: string;
  statusTone: 'default' | 'secondary' | 'destructive' | 'outline';
  pinLabel: string;
  actions: ReturnType<typeof staffRowActions>;
  onEdit: (() => void) | null;
  onSetPin: (() => void) | null;
  onRemovePin: (() => void) | null;
  onDisable: (() => void) | null;
  onEnable: (() => void) | null;
  onRegenerateInvite: (() => void) | null;
  onRevokeInvite: (() => void) | null;
};

type BranchScopeState = {
  allBranches: boolean;
  branchIds: string[];
};

const emptyScope = (): BranchScopeState => ({ allBranches: true, branchIds: [] });

function roleOptionsForKeys(
  keys: SystemRoleKey[],
  label: (key: SystemRoleKey) => string,
  description: (key: SystemRoleKey) => string,
): StaffRoleOption[] {
  return keys.map((value) => ({
    value,
    label: label(value),
    description: description(value),
  }));
}

export function useStaffSettingsPage() {
  const { t } = useTranslation();
  const { allowed, redirectTo } = useSettingsPageAccess('staff.read');
  const role = useAppSelector(selectSessionRole);
  const sessionBranches = useAppSelector(selectSessionBranches);
  const hasStaffManage = useAppSelector(selectCan('staff.manage'));
  const { data, isLoading, isError } = useListStaffQuery(undefined, { skip: !allowed });

  const actorRoleKey = useMemo(() => parseSystemRoleKey(role?.key), [role?.key]);
  const actorMembershipId = useMemo(
    () => data?.items.find((m) => m.isSelf)?.id ?? '',
    [data?.items],
  );

  const [patchStaff, patchStaffState] = usePatchStaffMembershipMutation();
  const [regenerateInvite] = useRegenerateStaffInviteMutation();
  const [revokeInvite] = useRevokeStaffInviteMutation();
  const [createInvite, createInviteState] = useCreateStaffInviteMutation();
  const [createPinOnly, createPinOnlyState] = useCreatePinOnlyStaffMutation();
  const [putStaffPin, putPinState] = usePutStaffPinMutation();
  const [deleteStaffPin, deletePinState] = useDeleteStaffPinMutation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [pinOnlyOpen, setPinOnlyOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<SystemRoleKey>('cashier');
  const [inviteScope, setInviteScope] = useState<BranchScopeState>(emptyScope);
  const [inviteScopeError, setInviteScopeError] = useState<string | null>(null);

  const [pinOnlyName, setPinOnlyName] = useState('');
  const [pinOnlyNameError, setPinOnlyNameError] = useState<string | null>(null);
  const [pinOnlyRole, setPinOnlyRole] = useState<SystemRoleKey>('cashier');
  const [pinOnlyScope, setPinOnlyScope] = useState<BranchScopeState>(emptyScope);
  const [pinOnlyScopeError, setPinOnlyScopeError] = useState<string | null>(null);
  const [pinOnlyPin, setPinOnlyPin] = useState('');
  const [pinOnlyPinConfirm, setPinOnlyPinConfirm] = useState('');
  const [pinOnlyPinError, setPinOnlyPinError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<SystemRoleKey>('cashier');
  const [editScope, setEditScope] = useState<BranchScopeState>(emptyScope);
  const [editScopeError, setEditScopeError] = useState<string | null>(null);

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogMemberId, setPinDialogMemberId] = useState<string | null>(null);
  const [pinDialogMemberName, setPinDialogMemberName] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinFormError, setPinFormError] = useState<string | null>(null);

  const [removePinOpen, setRemovePinOpen] = useState(false);
  const [removePinMemberId, setRemovePinMemberId] = useState<string | null>(null);
  const [removePinMemberName, setRemovePinMemberName] = useState('');

  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [disableMemberId, setDisableMemberId] = useState<string | null>(null);
  const [disableMemberName, setDisableMemberName] = useState('');

  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [revokeMemberId, setRevokeMemberId] = useState<string | null>(null);
  const [revokeMemberName, setRevokeMemberName] = useState('');

  const [inviteLinkOpen, setInviteLinkOpen] = useState(false);
  const [inviteLinkUrl, setInviteLinkUrl] = useState('');
  const [inviteLinkCopyLabel, setInviteLinkCopyLabel] = useState<string | null>(null);

  const branchOptions: StaffBranchOption[] = useMemo(
    () => sessionBranches.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name })),
    [sessionBranches],
  );

  const roleLabel = useCallback(
    (key: SystemRoleKey) => t(`settings.staff.roles.${key}`),
    [t],
  );
  const roleDescription = useCallback(
    (key: SystemRoleKey) => t(`settings.staff.roleDescriptions.${key}`),
    [t],
  );

  const inviteRoleOptions = useMemo(
    () => roleOptionsForKeys(invitableRoleKeys(actorRoleKey), roleLabel, roleDescription),
    [actorRoleKey, roleDescription, roleLabel],
  );
  const editRoleOptions = useMemo(
    () => roleOptionsForKeys(assignableRoleKeys(actorRoleKey), roleLabel, roleDescription),
    [actorRoleKey, roleDescription, roleLabel],
  );
  const pinOnlyRoleOptions = useMemo(
    () => roleOptionsForKeys(pinOnlyInvitableRoleKeys(actorRoleKey), roleLabel, roleDescription),
    [actorRoleKey, roleDescription, roleLabel],
  );

  useEffect(() => {
    const first = inviteRoleOptions[0]?.value;
    if (first !== undefined && !inviteRoleOptions.some((o) => o.value === inviteRole)) {
      setInviteRole(first);
    }
  }, [inviteRole, inviteRoleOptions]);

  useEffect(() => {
    const first = pinOnlyRoleOptions[0]?.value;
    if (first !== undefined && !pinOnlyRoleOptions.some((o) => o.value === pinOnlyRole)) {
      setPinOnlyRole(first);
    }
  }, [pinOnlyRole, pinOnlyRoleOptions]);

  const activeOwnerCount = useMemo(() => {
    return (data?.items ?? []).filter((m) => m.roleKey === 'owner' && m.status === 'active').length;
  }, [data?.items]);

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

  const openInviteLinkDialog = useCallback((url: string) => {
    setInviteLinkUrl(url);
    setInviteLinkCopyLabel(null);
    setInviteLinkOpen(true);
  }, []);

  const patchStatus = useCallback(
    async (membershipId: string, status: 'active' | 'disabled') => {
      const result = await patchStaff({ membershipId, body: { status } });
      if ('error' in result) {
        showApiError(result.error, t);
        return false;
      }
      toast.success(t('settings.staff.saved'));
      return true;
    },
    [patchStaff, t],
  );

  const openEditForMember = useCallback((member: StaffListItem) => {
    setEditMemberId(member.id);
    setEditRole(member.roleKey);
    setEditScope({
      allBranches: member.allBranches,
      branchIds: member.allBranches ? [] : [...member.branchIds],
    });
    setEditScopeError(null);
    setEditOpen(true);
  }, []);

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
        onEdit: actions.canEditMembership
          ? () => {
              openEditForMember(member);
            }
          : null,
        onSetPin: actions.canSetPin
          ? () => {
              setPinDialogMemberId(member.id);
              setPinDialogMemberName(member.name);
              setPinValue('');
              setPinConfirm('');
              setPinFormError(null);
              setPinDialogOpen(true);
            }
          : null,
        onRemovePin: actions.canRemovePin
          ? () => {
              setRemovePinMemberId(member.id);
              setRemovePinMemberName(member.name);
              setRemovePinOpen(true);
            }
          : null,
        onDisable: actions.canDisable
          ? () => {
              setDisableMemberId(member.id);
              setDisableMemberName(member.name);
              setDisableConfirmOpen(true);
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
                  showApiError(result.error, t);
                  return;
                }
                openInviteLinkDialog(result.data.inviteUrl);
              });
            }
          : null,
        onRevokeInvite: actions.canRevokeInvite
          ? () => {
              setRevokeMemberId(member.id);
              setRevokeMemberName(member.name);
              setRevokeConfirmOpen(true);
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
    openEditForMember,
    openInviteLinkDialog,
    patchStatus,
    regenerateInvite,
    roleLabel,
    statusMeta,
    t,
  ]);

  const canAddStaff =
    hasStaffManage &&
    actorRoleKey !== null &&
    (invitableRoleKeys(actorRoleKey).length > 0 || pinOnlyInvitableRoleKeys(actorRoleKey).length > 0);

  const scopePayload = (scope: BranchScopeState) => {
    const validated = validateBranchScope(scope);
    if (!validated.ok) {
      return null;
    }
    return { allBranches: validated.allBranches, branchIds: validated.branchIds };
  };

  const onSubmitInvite = useCallback(async () => {
    const emailParsed = z.email().safeParse(inviteEmail.trim());
    if (!emailParsed.success) {
      setInviteEmailError(t('settings.staff.inviteEmailInvalid'));
      return;
    }
    setInviteEmailError(null);
    const scope = scopePayload(inviteScope);
    if (!scope) {
      setInviteScopeError(t('settings.staff.branchesRequired'));
      return;
    }
    setInviteScopeError(null);
    const result = await createInvite({
      email: emailParsed.data,
      roleKey: inviteRole,
      ...scope,
    });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setInviteOpen(false);
    setInviteEmail('');
    setInviteScope(emptyScope());
    openInviteLinkDialog(result.data.inviteUrl);
  }, [createInvite, inviteEmail, inviteRole, inviteScope, openInviteLinkDialog, t]);

  const onSubmitPinOnly = useCallback(async () => {
    const name = pinOnlyName.trim();
    if (name.length === 0) {
      setPinOnlyNameError(t('settings.staff.pinOnlyNameRequired'));
      return;
    }
    setPinOnlyNameError(null);
    const pinCheck = validatePinForm(pinOnlyPin, pinOnlyPinConfirm);
    if (!pinCheck.ok) {
      setPinOnlyPinError(t(`settings.staff.pinError.${pinCheck.reason}`));
      return;
    }
    setPinOnlyPinError(null);
    const scope = scopePayload(pinOnlyScope);
    if (!scope) {
      setPinOnlyScopeError(t('settings.staff.branchesRequired'));
      return;
    }
    setPinOnlyScopeError(null);
    const pinOnlyRoleKey = asPinOnlyRoleKey(pinOnlyRole);
    if (pinOnlyRoleKey === null) {
      return;
    }
    const result = await createPinOnly({
      name,
      roleKey: pinOnlyRoleKey,
      pin: pinCheck.pin,
      ...scope,
    });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setPinOnlyOpen(false);
    setPinOnlyName('');
    setPinOnlyNameError(null);
    setPinOnlyPin('');
    setPinOnlyPinConfirm('');
    setPinOnlyScope(emptyScope());
    toast.success(t('settings.staff.pinOnlyCreated'));
  }, [createPinOnly, pinOnlyName, pinOnlyPin, pinOnlyPinConfirm, pinOnlyRole, pinOnlyScope, t]);

  const onSubmitEdit = useCallback(async () => {
    if (!editMemberId) {
      return;
    }
    const scope = scopePayload(editScope);
    if (!scope) {
      setEditScopeError(t('settings.staff.branchesRequired'));
      return;
    }
    setEditScopeError(null);
    const result = await patchStaff({
      membershipId: editMemberId,
      body: { roleKey: editRole, ...scope },
    });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setEditOpen(false);
    toast.success(t('settings.staff.saved'));
  }, [editMemberId, editRole, editScope, patchStaff, t]);

  const onSubmitPinDialog = useCallback(async () => {
    if (!pinDialogMemberId) {
      return;
    }
    const pinCheck = validatePinForm(pinValue, pinConfirm);
    if (!pinCheck.ok) {
      setPinFormError(t(`settings.staff.pinError.${pinCheck.reason}`));
      return;
    }
    setPinFormError(null);
    const result = await putStaffPin({
      membershipId: pinDialogMemberId,
      body: { pin: pinCheck.pin },
    });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setPinDialogOpen(false);
    toast.success(t('settings.staff.pinSaved'));
  }, [pinConfirm, pinDialogMemberId, pinValue, putStaffPin, t]);

  const onConfirmRemovePin = useCallback(async () => {
    if (!removePinMemberId) {
      return;
    }
    const result = await deleteStaffPin(removePinMemberId);
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setRemovePinOpen(false);
    toast.success(t('settings.staff.pinRemoved'));
  }, [deleteStaffPin, removePinMemberId, t]);

  const onConfirmDisable = useCallback(async () => {
    if (!disableMemberId) {
      return;
    }
    const ok = await patchStatus(disableMemberId, 'disabled');
    if (ok) {
      setDisableConfirmOpen(false);
    }
  }, [disableMemberId, patchStatus]);

  const onConfirmRevoke = useCallback(async () => {
    if (!revokeMemberId) {
      return;
    }
    const result = await revokeInvite(revokeMemberId);
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setRevokeConfirmOpen(false);
    toast.success(t('settings.staff.inviteRevoked'));
  }, [revokeInvite, revokeMemberId, t]);

  const onCopyInviteLink = useCallback(() => {
    void navigator.clipboard.writeText(inviteLinkUrl).then(
      () => {
        setInviteLinkCopyLabel(t('settings.staff.inviteCopied'));
      },
      () => {
        setInviteLinkCopyLabel(t('settings.staff.inviteCopyFailed'));
      },
    );
  }, [inviteLinkUrl, t]);

  const toggleBranchInScope = useCallback(
    (scope: BranchScopeState, branchId: string, checked: boolean): BranchScopeState => {
      if (checked) {
        return { ...scope, branchIds: [...scope.branchIds, branchId] };
      }
      return { ...scope, branchIds: scope.branchIds.filter((id) => id !== branchId) };
    },
    [],
  );

  return {
    redirectTo,
    isLoading,
    isError,
    rows,
    canAddStaff,
    branchOptions,
    inviteRoleOptions,
    editRoleOptions,
    pinOnlyRoleOptions,
    inviteOpen,
    onInviteOpenChange: setInviteOpen,
    pinOnlyOpen,
    onPinOnlyOpenChange: setPinOnlyOpen,
    inviteEmail,
    onInviteEmailChange: (value: string) => {
      setInviteEmail(value);
      setInviteEmailError(null);
    },
    inviteEmailError,
    inviteRole,
    onInviteRoleChange: (value: string) => {
      const parsed = parseSystemRoleKey(value);
      if (parsed !== null) {
        setInviteRole(parsed);
      }
    },
    inviteScope,
    onInviteAllBranchesChange: (checked: boolean) => {
      setInviteScope((prev) => ({
        allBranches: checked,
        branchIds: checked ? [] : prev.branchIds,
      }));
      setInviteScopeError(null);
    },
    onInviteBranchToggle: (branchId: string, checked: boolean) => {
      setInviteScope((prev) => toggleBranchInScope({ ...prev, allBranches: false }, branchId, checked));
      setInviteScopeError(null);
    },
    inviteScopeError,
    inviteSubmitting: createInviteState.isLoading,
    onSubmitInvite: () => {
      void onSubmitInvite();
    },
    pinOnlyName,
    onPinOnlyNameChange: (value: string) => {
      setPinOnlyName(value);
      setPinOnlyNameError(null);
    },
    pinOnlyNameError,
    pinOnlyRole,
    onPinOnlyRoleChange: (value: string) => {
      const parsed = parseSystemRoleKey(value);
      if (parsed !== null) {
        setPinOnlyRole(parsed);
      }
    },
    pinOnlyScope,
    onPinOnlyAllBranchesChange: (checked: boolean) => {
      setPinOnlyScope((prev) => ({
        allBranches: checked,
        branchIds: checked ? [] : prev.branchIds,
      }));
      setPinOnlyScopeError(null);
    },
    onPinOnlyBranchToggle: (branchId: string, checked: boolean) => {
      setPinOnlyScope((prev) => toggleBranchInScope({ ...prev, allBranches: false }, branchId, checked));
      setPinOnlyScopeError(null);
    },
    pinOnlyScopeError,
    pinOnlyPin,
    onPinOnlyPinChange: setPinOnlyPin,
    pinOnlyPinConfirm,
    onPinOnlyPinConfirmChange: setPinOnlyPinConfirm,
    pinOnlyPinError,
    pinOnlySubmitting: createPinOnlyState.isLoading,
    onSubmitPinOnly: () => {
      void onSubmitPinOnly();
    },
    editOpen,
    onEditOpenChange: setEditOpen,
    editRole,
    onEditRoleChange: (value: string) => {
      const parsed = parseSystemRoleKey(value);
      if (parsed !== null) {
        setEditRole(parsed);
      }
    },
    editScope,
    onEditAllBranchesChange: (checked: boolean) => {
      setEditScope((prev) => ({
        allBranches: checked,
        branchIds: checked ? [] : prev.branchIds,
      }));
      setEditScopeError(null);
    },
    onEditBranchToggle: (branchId: string, checked: boolean) => {
      setEditScope((prev) => toggleBranchInScope({ ...prev, allBranches: false }, branchId, checked));
      setEditScopeError(null);
    },
    editScopeError,
    editSubmitting: patchStaffState.isLoading,
    onSubmitEdit: () => {
      void onSubmitEdit();
    },
    pinDialogOpen,
    onPinDialogOpenChange: setPinDialogOpen,
    pinDialogMemberName,
    pinValue,
    onPinValueChange: setPinValue,
    pinConfirm,
    onPinConfirmChange: setPinConfirm,
    pinFormError,
    pinSubmitting: putPinState.isLoading,
    onSubmitPinDialog: () => {
      void onSubmitPinDialog();
    },
    removePinOpen,
    onRemovePinOpenChange: setRemovePinOpen,
    removePinMemberName,
    removePinSubmitting: deletePinState.isLoading,
    onConfirmRemovePin: () => {
      void onConfirmRemovePin();
    },
    disableConfirmOpen,
    onDisableConfirmOpenChange: setDisableConfirmOpen,
    disableMemberName,
    onConfirmDisable: () => {
      void onConfirmDisable();
    },
    revokeConfirmOpen,
    onRevokeConfirmOpenChange: setRevokeConfirmOpen,
    revokeMemberName,
    onConfirmRevoke: () => {
      void onConfirmRevoke();
    },
    inviteLinkOpen,
    onInviteLinkOpenChange: setInviteLinkOpen,
    inviteLinkUrl,
    inviteLinkCopyLabel,
    onCopyInviteLink,
    labels: {
      title: t('settings.staff.title'),
      description: t('settings.staff.description'),
      addStaff: t('settings.staff.addStaff'),
      addStaffInvite: t('settings.staff.addStaffInvite'),
      addStaffPinOnly: t('settings.staff.addStaffPinOnly'),
      loadError: t('settings.staff.loadError'),
      loading: t('common.loading'),
      empty: t('settings.staff.empty'),
      columnName: t('settings.staff.columnName'),
      columnEmail: t('settings.staff.columnEmail'),
      columnRole: t('settings.staff.columnRole'),
      columnStatus: t('settings.staff.columnStatus'),
      columnPin: t('settings.staff.columnPin'),
      actions: t('settings.staff.actions'),
      edit: t('settings.staff.edit'),
      setPin: t('settings.staff.setPin'),
      removePin: t('settings.staff.removePin'),
      disable: t('settings.staff.disable'),
      enable: t('settings.staff.enable'),
      regenerateInvite: t('settings.staff.regenerateInvite'),
      revokeInvite: t('settings.staff.revokeInvite'),
      inviteDialogTitle: t('settings.staff.inviteDialogTitle'),
      pinOnlyDialogTitle: t('settings.staff.pinOnlyDialogTitle'),
      editDialogTitle: t('settings.staff.editDialogTitle'),
      pinDialogTitle: t('settings.staff.pinDialogTitle'),
      removePinDialogTitle: t('settings.staff.removePinDialogTitle'),
      disableDialogTitle: t('settings.staff.disableDialogTitle'),
      disableDialogDescription: t('settings.staff.disableDialogDescription'),
      revokeDialogTitle: t('settings.staff.revokeDialogTitle'),
      revokeDialogDescription: t('settings.staff.revokeDialogDescription'),
      inviteLinkDialogTitle: t('settings.staff.inviteLinkDialogTitle'),
      inviteLinkValidFor: t('settings.staff.inviteLinkValidFor'),
      inviteLinkCopy: t('settings.staff.inviteLinkCopy'),
      inviteEmail: t('settings.staff.inviteEmail'),
      inviteRole: t('settings.staff.inviteRole'),
      inviteSubmit: t('settings.staff.inviteSubmit'),
      pinOnlyName: t('settings.staff.pinOnlyName'),
      pinOnlySubmit: t('settings.staff.pinOnlySubmit'),
      pinLabel: t('settings.staff.pinLabel'),
      pinConfirmLabel: t('settings.staff.pinConfirmLabel'),
      allBranches: t('settings.staff.allBranches'),
      branches: t('settings.staff.branches'),
      save: t('settings.staff.saveEdit'),
      cancel: t('common.cancel'),
      confirm: t('settings.staff.confirm'),
    },
  };
}

export type StaffSettingsPageViewModel = ReturnType<typeof useStaffSettingsPage>;
