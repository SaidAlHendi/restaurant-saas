import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch } from '../../../app/hooks.js';
import { baseApi } from '../../../app/api/base-api.js';
import { authApi, usePinLoginMutation } from '../../auth/auth.api.js';
import { messageFromOrdersMutationError, parseOrdersApiErrorCode } from '../../orders/orders-api-errors.js';
import { hydrateFromMe, setAccessToken } from '../../session/session.slice.js';
import { formatPinLockCountdown, parsePinLockedUntilIso } from '../pos-pin-lock.utils.js';
import { useListPinUsersQuery } from '../pos.api.js';
import { usePosPinPad } from './use-pos-pin-pad.js';

export function usePosLockScreen(input: {
  branchId: string | null;
  enabled: boolean;
  onUnlocked: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockedUntilIso, setLockedUntilIso] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const pinPad = usePosPinPad();
  const [pinLogin, pinLoginState] = usePinLoginMutation();

  const pinUsersQuery = useListPinUsersQuery(input.branchId ?? '', {
    skip: !input.enabled || input.branchId === null,
  });

  const users = pinUsersQuery.data?.items ?? [];

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

  const lockCountdown = useMemo(() => {
    if (lockedUntilIso === null) {
      return null;
    }
    return formatPinLockCountdown(lockedUntilIso, nowMs);
  }, [lockedUntilIso, nowMs]);

  const submitPin = useCallback(async () => {
    if (selectedMembershipId === null || !pinPad.canSubmit) {
      return;
    }
    setErrorMessage(null);
    const result = await pinLogin({
      membershipId: selectedMembershipId,
      pin: pinPad.digits,
    });
    if ('error' in result) {
      const code = parseOrdersApiErrorCode(result.error);
      if (code === 'PIN_LOCKED') {
        setLockedUntilIso(parsePinLockedUntilIso(result.error));
      }
      setErrorMessage(messageFromOrdersMutationError(result.error, t));
      pinPad.clear();
      return;
    }
    dispatch(baseApi.util.resetApiState());
    dispatch(setAccessToken(result.data.accessToken));
    try {
      const me = await dispatch(authApi.endpoints.getMe.initiate(undefined)).unwrap();
      dispatch(hydrateFromMe(me));
    } catch {
      /* token is valid; session will refetch on next navigation */
    }
    pinPad.clear();
    setSelectedMembershipId(null);
    setLockedUntilIso(null);
    input.onUnlocked();
  }, [dispatch, input, pinLogin, pinPad, selectedMembershipId, t]);

  return {
    loading: pinUsersQuery.isLoading,
    users: users.map((user) => ({
      membershipId: user.membershipId,
      name: user.name,
      roleLabel: t(`settings.staff.roles.${user.roleKey}`),
      selected: selectedMembershipId === user.membershipId,
      onSelect: () => {
        setSelectedMembershipId(user.membershipId);
        setErrorMessage(null);
        pinPad.clear();
      },
    })),
    pinPad: {
      digits: pinPad.digits,
      canSubmit: pinPad.canSubmit && selectedMembershipId !== null && lockCountdown === null,
      onDigit: pinPad.appendDigit,
      onBackspace: pinPad.backspace,
      onSubmit: () => {
        void submitPin();
      },
      submitting: pinLoginState.isLoading,
    },
    errorMessage,
    lockCountdown,
    labels: {
      title: t('pos.lock.title'),
      subtitle: t('pos.lock.subtitle'),
      pickUser: t('pos.lock.pickUser'),
      emptyUsers: t('pos.lock.emptyUsers'),
      backspace: t('pos.lock.backspace'),
      submit: t('pos.lock.submit'),
      locked: t('pos.lock.lockedCountdown'),
      loading: t('common.loading'),
    },
  };
}

export type PosLockScreenViewModel = ReturnType<typeof usePosLockScreen>;
