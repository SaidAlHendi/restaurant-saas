import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../app/hooks.js';
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
  const [manualLocked, setManualLocked] = useState(false);

  const showLockScreen = manualLocked || !canUsePos;

  const onUnlocked = useCallback(() => {
    setManualLocked(false);
  }, []);

  const lockScreen = usePosLockScreen({
    branchId,
    enabled: showLockScreen,
    onUnlocked,
  });

  const requestLock = useCallback(() => {
    setManualLocked(true);
  }, []);

  return {
    t,
    bootstrapDone,
    showLockScreen,
    lockScreen,
    requestLock,
  };
}

export type PosAreaViewModel = ReturnType<typeof usePosArea>;
