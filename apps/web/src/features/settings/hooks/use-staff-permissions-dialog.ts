import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OVERRIDABLE_PERMISSION_KEYS, putStaffPermissionOverridesBodySchema } from '@app/shared';
import { toast } from '@app/ui';

import { showApiError } from '../../../lib/show-api-error.js';
import { useGetStaffPermissionsQuery, usePutStaffPermissionsMutation } from '../settings.api.js';
import {
  hasPermissionOverride,
  isPermissionEnabled,
  setPermissionEnabled,
  type PermissionDraft,
} from '../staff-permissions-form.utils.js';

export type StaffPermissionsMember = { id: string; name: string };

export type StaffPermissionItem = {
  key: string;
  label: string;
  enabled: boolean;
  /** True when this employee differs from their role's default. */
  overridden: boolean;
};

/** Render with `key={member.id}` so the draft resets when another employee is opened. */
export function useStaffPermissionsDialog(member: StaffPermissionsMember, onClose: () => void) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetStaffPermissionsQuery(member.id);
  const [putPermissions, putState] = usePutStaffPermissionsMutation();
  const [edited, setEdited] = useState<PermissionDraft | null>(null);

  const draft: PermissionDraft = useMemo(
    () => edited ?? { grant: data?.grant ?? [], deny: data?.deny ?? [] },
    [data?.deny, data?.grant, edited],
  );
  const rolePermissions = useMemo(() => data?.rolePermissions ?? [], [data?.rolePermissions]);

  const items: StaffPermissionItem[] = useMemo(
    () =>
      OVERRIDABLE_PERMISSION_KEYS.map((key) => ({
        key,
        label: t(`settings.staff.permissions.keys.${key}`),
        enabled: isPermissionEnabled(rolePermissions, draft, key),
        overridden: hasPermissionOverride(draft, key),
      })),
    [draft, rolePermissions, t],
  );

  const onToggle = useCallback(
    (key: string, enabled: boolean) => {
      setEdited(setPermissionEnabled(rolePermissions, draft, key, enabled));
    },
    [draft, rolePermissions],
  );

  const onReset = useCallback(() => {
    setEdited({ grant: [], deny: [] });
  }, []);

  const onSave = useCallback(async () => {
    const body = putStaffPermissionOverridesBodySchema.safeParse(draft);
    if (!body.success) {
      return;
    }
    const result = await putPermissions({ membershipId: member.id, body: body.data });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    toast.success(t('settings.staff.permissions.saved'));
    onClose();
  }, [draft, member.id, onClose, putPermissions, t]);

  return {
    isLoading,
    isError,
    items,
    hasOverrides: draft.grant.length > 0 || draft.deny.length > 0,
    submitting: putState.isLoading,
    onToggle,
    onReset,
    onSave: () => {
      void onSave();
    },
    labels: {
      title: t('settings.staff.permissions.title', { name: member.name }),
      description: t('settings.staff.permissions.description'),
      overridden: t('settings.staff.permissions.overridden'),
      reset: t('settings.staff.permissions.reset'),
      loadError: t('settings.staff.permissions.loadError'),
      loading: t('common.loading'),
      save: t('settings.staff.saveEdit'),
      cancel: t('common.cancel'),
      close: t('settings.staff.close'),
    },
  };
}

export type StaffPermissionsDialogViewModel = ReturnType<typeof useStaffPermissionsDialog>;
