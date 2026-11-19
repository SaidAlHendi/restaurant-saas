import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { useLogoutMutation } from '../../auth/auth.api.js';
import { clearSession } from '../../session/session.slice.js';
import { readPosDeviceLocked, writePosDeviceLocked } from '../pos-device-lock-storage.js';
import {
  selectBootstrapDone,
  selectCan,
  selectCurrentBranchId,
  selectHasFeature,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import { usePosLockScreen } from './use-pos-lock-screen.js';

export function usePosArea() {
  const { t } = useTranslation();
  const bootstrapDone = useAppSelector(selectBootstrapDone);
  const canUsePos = useAppSelector(selectCan('orders.create'));
  const hasPosFeature = useAppSelector(selectHasFeature('pos.access'));
  const branchId = useAppSelector(selectCurrentBranchId);
  const orgId = useAppSelector(selectSessionOrg)?.id ?? null;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const [deviceLocked, setDeviceLocked] = useState(() => readPosDeviceLocked(orgId));
  const [pinSwitchOpen, setPinSwitchOpen] = useState(false);

  // The plan comes first: a locked device on an expired trial still shows the upgrade screen.
  const showUpgrade = !hasPosFeature;
  const showLockScreen = !showUpgrade && (deviceLocked || pinSwitchOpen);
  const showNoAccess = !showUpgrade && !canUsePos && !showLockScreen;

  const onUnlocked = useCallback(() => {
    writePosDeviceLocked(orgId, false);
    setDeviceLocked(false);
    setPinSwitchOpen(false);
  }, [orgId]);

  const onSignOut = useCallback(async () => {
    writePosDeviceLocked(orgId, false);
    try {
      await logout(undefined).unwrap();
    } catch {
      // Sign out locally even when the server call fails (offline, expired session).
    } finally {
      dispatch(clearSession());
      dispatch(baseApi.util.resetApiState());
      void navigate('/login', { replace: true });
    }
  }, [dispatch, logout, navigate, orgId]);

  const lockScreen = usePosLockScreen({
    branchId,
    enabled: showLockScreen,
    onUnlocked,
    onSignOut: () => {
      void onSignOut();
    },
  });

  // A locked device with nobody to unlock it would trap the user: drop the lock.
  const nobodyCanUnlock = deviceLocked && lockScreen.noPinUsers;
  useEffect(() => {
    if (nobodyCanUnlock) {
      onUnlocked();
    }
  }, [nobodyCanUnlock, onUnlocked]);

  const requestLock = useCallback(() => {
    writePosDeviceLocked(orgId, true);
    setDeviceLocked(true);
  }, [orgId]);

  const openPinSwitch = useCallback(() => {
    setPinSwitchOpen(true);
  }, []);

  return {
    t,
    bootstrapDone,
    canUsePos,
    showUpgrade,
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
