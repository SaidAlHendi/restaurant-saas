import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../app/hooks.js';
import {
  readPosDeviceLocked,
  writePosDeviceLocked,
} from '../pos-device-lock-storage.js';
import {
  selectBootstrapDone,
  selectCan,
  selectCurrentBranchId,
} from '../../session/session.selectors.js';
import { usePosLockScreen } from './use-pos-lock-screen.js';

export function usePosArea() {
  const { t } = useTranslation();
  const bootstrapDone = useAppSelector(selectBootstrapDone);
  const canUsePos = useAppSelector(selectCan('orders.create'));
  const branchId = useAppSelector(selectCurrentBranchId);
  const [deviceLocked, setDeviceLocked] = useState(() => readPosDeviceLocked());
  const [pinSwitchOpen, setPinSwitchOpen] = useState(false);

  const showLockScreen = deviceLocked || pinSwitchOpen;
  const showNoAccess = !canUsePos && !showLockScreen;

  const onUnlocked = useCallback(() => {
    writePosDeviceLocked(false);
    setDeviceLocked(false);
    setPinSwitchOpen(false);
  }, []);

  const lockScreen = usePosLockScreen({
    branchId,
    enabled: showLockScreen,
    onUnlocked,
  });

  const requestLock = useCallback(() => {
    writePosDeviceLocked(true);
    setDeviceLocked(true);
  }, []);

  const openPinSwitch = useCallback(() => {
    setPinSwitchOpen(true);
  }, []);

  return {
    t,
    bootstrapDone,
    canUsePos,
    showLockScreen,
    showNoAccess,
    lockScreen,
    requestLock,
    openPinSwitch,
    noAccess: {
      title: t('pos.noAccess.title'),
      description: t('pos.noAccess.description'),
      backLabel: t('pos.noAccess.backToDashboard'),
      backTo: '/dashboard',
      switchUserLabel: t('pos.lock.switchUser'),
      onSwitchUser: openPinSwitch,
    },
  };
}

export type PosAreaViewModel = ReturnType<typeof usePosArea>;
