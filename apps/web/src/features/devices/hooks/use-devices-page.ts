import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import { useAppSelector } from '../../../app/hooks.js';
import { showApiError } from '../../../lib/show-api-error.js';
import { selectCan, selectSessionBranches } from '../../session/session.selectors.js';
import {
  useCreateDeviceMutation,
  useListDevicesQuery,
  useRevokeDeviceMutation,
} from '../devices.api.js';

export type DeviceRow = {
  id: string;
  name: string;
  branchName: string;
  statusLabel: string;
  statusTone: 'default' | 'secondary';
  lastUsedLabel: string;
  onRevoke: () => void;
};

export function useDevicesPage() {
  const { t, i18n } = useTranslation();
  const allowed = useAppSelector(selectCan('staff.manage'));
  const sessionBranches = useAppSelector(selectSessionBranches);
  const { data, isLoading, isError } = useListDevicesQuery(undefined, {
    skip: !allowed,
    pollingInterval: 30_000,
    refetchOnFocus: true,
  });
  const [createDevice, createState] = useCreateDeviceMutation();
  const [revokeDevice, revokeState] = useRevokeDeviceMutation();

  const branchOptions = useMemo(
    () => sessionBranches.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name })),
    [sessionBranches],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

  const effectiveBranchId = branchId || branchOptions[0]?.id || '';

  const formatDate = useCallback(
    (iso: string | null) =>
      iso === null
        ? t('devices.never')
        : new Intl.DateTimeFormat(i18n.language, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(iso)),
    [i18n.language, t],
  );

  const rows: DeviceRow[] = useMemo(
    () =>
      (data?.items ?? []).map((device) => ({
        id: device.id,
        name: device.name,
        branchName: device.branchName,
        statusLabel: t(`devices.status.${device.status}`),
        statusTone: device.status === 'active' ? 'default' : 'secondary',
        lastUsedLabel:
          device.status === 'pending' ? t('devices.waitingToLink') : formatDate(device.lastUsedAt),
        onRevoke: () => {
          setRevokeTarget({ id: device.id, name: device.name });
        },
      })),
    [data?.items, formatDate, t],
  );

  const openCreate = useCallback(() => {
    setName('');
    setNameError(null);
    setPairingCode(null);
    setCreateOpen(true);
  }, []);

  const onSubmitCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameError(t('devices.create.nameRequired'));
      return;
    }
    setNameError(null);
    const result = await createDevice({ branchId: effectiveBranchId, name: trimmed });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setPairingCode(result.data.pairingCode);
  }, [createDevice, effectiveBranchId, name, t]);

  const onConfirmRevoke = useCallback(async () => {
    if (revokeTarget === null) {
      return;
    }
    const result = await revokeDevice(revokeTarget.id);
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    setRevokeTarget(null);
    toast.success(t('devices.revoked'));
  }, [revokeDevice, revokeTarget, t]);

  return {
    redirectTo: allowed ? null : '/dashboard',
    isLoading,
    isError,
    rows,
    branchOptions,
    createOpen,
    onCreateOpenChange: (open: boolean) => {
      setCreateOpen(open);
    },
    openCreate,
    name,
    onNameChange: (value: string) => {
      setName(value);
      setNameError(null);
    },
    nameError,
    branchId: effectiveBranchId,
    onBranchChange: setBranchId,
    creating: createState.isLoading,
    onSubmitCreate: () => {
      void onSubmitCreate();
    },
    pairingCode,
    revokeOpen: revokeTarget !== null,
    revokeName: revokeTarget?.name ?? '',
    onRevokeOpenChange: (open: boolean) => {
      if (!open) {
        setRevokeTarget(null);
      }
    },
    revoking: revokeState.isLoading,
    onConfirmRevoke: () => {
      void onConfirmRevoke();
    },
    labels: {
      title: t('devices.title'),
      description: t('devices.description'),
      add: t('devices.add'),
      loading: t('common.loading'),
      loadError: t('devices.loadError'),
      empty: t('devices.empty'),
      columnName: t('devices.columnName'),
      columnBranch: t('devices.columnBranch'),
      columnStatus: t('devices.columnStatus'),
      columnLastUsed: t('devices.columnLastUsed'),
      actions: t('devices.actions'),
      remove: t('devices.remove'),
      createTitle: t('devices.create.title'),
      createDescription: t('devices.create.description'),
      nameLabel: t('devices.create.nameLabel'),
      branchLabel: t('devices.create.branchLabel'),
      createSubmit: t('devices.create.submit'),
      codeTitle: t('devices.code.title'),
      codeHint: t('devices.code.hint'),
      codeSteps: t('devices.code.steps'),
      done: t('devices.code.done'),
      cancel: t('common.cancel'),
      close: t('settings.staff.close'),
      removeTitle: t('devices.removeTitle'),
      removeDescription: t('devices.removeDescription'),
    },
  };
}

export type DevicesPageViewModel = ReturnType<typeof useDevicesPage>;
