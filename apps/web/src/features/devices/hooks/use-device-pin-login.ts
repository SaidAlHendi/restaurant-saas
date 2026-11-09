import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '../../../app/hooks.js';
import { baseApi } from '../../../app/api/base-api.js';
import { authApi, useDevicePinLoginMutation, useDevicePinUsersQuery } from '../../auth/auth.api.js';
import {
  messageFromOrdersMutationError,
  parseOrdersApiErrorCode,
} from '../../orders/orders-api-errors.js';
import { usePosPinPad } from '../../pos/hooks/use-pos-pin-pad.js';
import { usePosPinPadKeyboard } from '../../pos/hooks/use-pos-pin-pad-keyboard.js';
import { formatPinLockCountdown, parsePinLockedUntilIso } from '../../pos/pos-pin-lock.utils.js';
import { landingPathForPermissions } from '../../session/landing-path.js';
import { hydrateFromMe, setAccessToken } from '../../session/session.slice.js';
import type { StoredDevice } from '../device-key-storage.js';
import { apiErrorCode } from '../api-error-code.js';

export function useDevicePinLogin(input: {
  device: StoredDevice;
  onDeviceInvalid: () => void;
  onUseEmail: () => void;
}) {
  const { device, onDeviceInvalid, onUseEmail } = input;
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockedUntilIso, setLockedUntilIso] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const pinPad = usePosPinPad();
  const [devicePinLogin, loginState] = useDevicePinLoginMutation();
  const usersQuery = useDevicePinUsersQuery(device.key);

  useEffect(() => {
    if (usersQuery.isError && apiErrorCode(usersQuery.error) === 'DEVICE_INVALID') {
      onDeviceInvalid();
    }
  }, [onDeviceInvalid, usersQuery.error, usersQuery.isError]);

  useEffect(() => {
    if (lockedUntilIso === null) {
      return;
    }
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [lockedUntilIso]);

  const lockCountdown = useMemo(
    () => (lockedUntilIso === null ? null : formatPinLockCountdown(lockedUntilIso, nowMs)),
    [lockedUntilIso, nowMs],
  );

  const selectUser = useCallback(
    (membershipId: string) => {
      setSelectedMembershipId(membershipId);
      setErrorMessage(null);
      setLockedUntilIso(null);
      pinPad.clear();
    },
    [pinPad],
  );

  const submitPin = useCallback(async () => {
    if (selectedMembershipId === null || !pinPad.canSubmit || lockCountdown !== null) {
      return;
    }
    setErrorMessage(null);
    const result = await devicePinLogin({
      deviceKey: device.key,
      membershipId: selectedMembershipId,
      pin: pinPad.digits,
    });
    if ('error' in result) {
      if (apiErrorCode(result.error) === 'DEVICE_INVALID') {
        onDeviceInvalid();
        return;
      }
      if (parseOrdersApiErrorCode(result.error) === 'PIN_LOCKED') {
        setLockedUntilIso(parsePinLockedUntilIso(result.error));
      }
      setErrorMessage(messageFromOrdersMutationError(result.error, t));
      pinPad.clear();
      return;
    }
    dispatch(baseApi.util.resetApiState());
    dispatch(setAccessToken(result.data.accessToken));
    try {
      const me = await dispatch(
        authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
      ).unwrap();
      dispatch(hydrateFromMe(me));
      void navigate(landingPathForPermissions(me.permissions), { replace: true });
    } catch {
      void navigate('/dashboard', { replace: true });
    }
  }, [
    device.key,
    devicePinLogin,
    dispatch,
    lockCountdown,
    navigate,
    onDeviceInvalid,
    pinPad,
    selectedMembershipId,
    t,
  ]);

  const canSubmitPin = pinPad.canSubmit && selectedMembershipId !== null && lockCountdown === null;

  usePosPinPadKeyboard({
    enabled: true,
    canSubmit: canSubmitPin,
    onDigit: pinPad.appendDigit,
    onBackspace: pinPad.backspace,
    onSubmit: () => {
      void submitPin();
    },
  });

  const users = usersQuery.data?.items ?? [];

  return {
    loading: usersQuery.isLoading,
    loadFailed: usersQuery.isError && apiErrorCode(usersQuery.error) !== 'DEVICE_INVALID',
    deviceLabel: `${device.orgName} · ${device.branchName}`,
    users: users.map((user) => ({
      membershipId: user.membershipId,
      name: user.name,
      roleLabel: t(`settings.staff.roles.${user.roleKey}`),
      selected: selectedMembershipId === user.membershipId,
      onSelect: () => {
        selectUser(user.membershipId);
      },
    })),
    pinPad: {
      digits: pinPad.digits,
      pinDigitsLabel: t('pos.lock.pinDigits', { count: String(pinPad.digits.length) }),
      canSubmit: canSubmitPin,
      onDigit: pinPad.appendDigit,
      onBackspace: pinPad.backspace,
      onSubmit: () => {
        void submitPin();
      },
      submitting: loginState.isLoading,
    },
    errorMessage,
    lockCountdown,
    onUseEmail,
    labels: {
      title: t('pos.lock.title'),
      subtitle: t('devices.login.subtitle'),
      pickUser: t('pos.lock.pickUser'),
      emptyUsers: t('pos.lock.emptyUsers'),
      backspace: t('pos.lock.backspace'),
      submit: t('devices.login.submit'),
      locked: t('pos.lock.lockedCountdown'),
      loading: t('common.loading'),
      loadError: t('devices.login.loadError'),
      useEmail: t('devices.login.useEmail'),
    },
  };
}

export type DevicePinLoginViewModel = ReturnType<typeof useDevicePinLogin>;
