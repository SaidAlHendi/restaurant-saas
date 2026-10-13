import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OrderApproval } from '@app/shared';

import {
  messageFromOrdersMutationError,
  parseOrdersApiErrorCode,
} from '../../orders/orders-api-errors.js';
import {
  buildOrderApprovalBody,
  filterApproverPinUsers,
  orderActionDialogStepAfterReason,
  type OrderActionDialogStep,
} from '../pos-approval.utils.js';
import { parsePinLockedUntilIso, formatPinLockCountdown } from '../pos-pin-lock.utils.js';
import { useListPinUsersQuery } from '../pos.api.js';
import { usePosPinPad } from './use-pos-pin-pad.js';
import { usePosPinPadKeyboard } from './use-pos-pin-pad-keyboard.js';

export function usePosOrderActionDialog(input: {
  branchId: string | null;
  open: boolean;
  needsApproval: boolean;
  onClose: () => void;
  onExecute: (args: {
    reason: string;
    approval?: OrderApproval;
  }) => Promise<{ ok: true } | { ok: false; error: unknown }>;
  submitting: boolean;
  title: string;
  reasonLabel: string;
  confirmLabel: string;
  cancelLabel: string;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<OrderActionDialogStep>('reason');
  const [reason, setReason] = useState('');
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockedUntilIso, setLockedUntilIso] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const pinPad = usePosPinPad();

  const pinUsersQuery = useListPinUsersQuery(input.branchId ?? '', {
    skip: !input.open || input.branchId === null,
  });

  const approvers = useMemo(
    () => filterApproverPinUsers(pinUsersQuery.data?.items ?? []),
    [pinUsersQuery.data?.items],
  );

  const clearPinPad = pinPad.clear;

  useEffect(() => {
    if (!input.open) {
      setStep('reason');
      setReason('');
      setSelectedMembershipId(null);
      setErrorMessage(null);
      setLockedUntilIso(null);
      clearPinPad();
    }
  }, [clearPinPad, input.open]);

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

  const handleApiError = useCallback(
    (error: unknown) => {
      const code = parseOrdersApiErrorCode(error);
      if (code === 'MANAGER_APPROVAL_REQUIRED') {
        setStep('approval');
        setErrorMessage(null);
        return;
      }
      if (code === 'PIN_LOCKED') {
        setLockedUntilIso(parsePinLockedUntilIso(error));
      }
      setErrorMessage(messageFromOrdersMutationError(error, t));
      pinPad.clear();
    },
    [pinPad, t],
  );

  const runSubmit = useCallback(
    async (approval?: OrderApproval) => {
      const trimmed = reason.trim();
      if (trimmed.length === 0) {
        return;
      }
      setErrorMessage(null);
      const result = await input.onExecute({ reason: trimmed, approval });
      if (result.ok) {
        input.onClose();
        return;
      }
      handleApiError(result.error);
    },
    [handleApiError, input, reason],
  );

  const onPrimary = useCallback(() => {
    if (step === 'reason') {
      if (reason.trim().length === 0) {
        return;
      }
      const next = orderActionDialogStepAfterReason(input.needsApproval);
      if (next === 'approval') {
        setStep('approval');
        return;
      }
      void runSubmit();
      return;
    }
    if (selectedMembershipId === null || !pinPad.canSubmit || lockCountdown !== null) {
      return;
    }
    void runSubmit(buildOrderApprovalBody(selectedMembershipId, pinPad.digits));
  }, [
    input.needsApproval,
    lockCountdown,
    pinPad.canSubmit,
    pinPad.digits,
    reason,
    runSubmit,
    selectedMembershipId,
    step,
  ]);

  const primaryDisabled =
    step === 'reason'
      ? reason.trim().length === 0
      : selectedMembershipId === null || !pinPad.canSubmit || lockCountdown !== null;

  const primaryLabel =
    step === 'reason' && orderActionDialogStepAfterReason(input.needsApproval) === 'approval'
      ? t('pos.orderDetail.approvalNext')
      : input.confirmLabel;

  const selectApprover = useCallback(
    (membershipId: string) => {
      setSelectedMembershipId(membershipId);
      setErrorMessage(null);
      setLockedUntilIso(null);
      pinPad.clear();
    },
    [pinPad],
  );

  const approvalCanSubmit =
    step === 'approval' &&
    selectedMembershipId !== null &&
    pinPad.canSubmit &&
    lockCountdown === null;

  usePosPinPadKeyboard({
    enabled: input.open && step === 'approval',
    canSubmit: approvalCanSubmit,
    onDigit: pinPad.appendDigit,
    onBackspace: pinPad.backspace,
    onSubmit: onPrimary,
  });

  return {
    step,
    reason,
    onReasonChange: setReason,
    approvers: approvers.map((user) => ({
      membershipId: user.membershipId,
      name: user.name,
      roleLabel: t(`settings.staff.roles.${user.roleKey}`),
      selected: selectedMembershipId === user.membershipId,
      onSelect: () => {
        selectApprover(user.membershipId);
      },
    })),
    pinPad: {
      digits: pinPad.digits,
      pinDigitsLabel: t('pos.lock.pinDigits', { count: String(pinPad.digits.length) }),
      canSubmit: pinPad.canSubmit,
      onDigit: pinPad.appendDigit,
      onBackspace: pinPad.backspace,
      onSubmit: onPrimary,
      submitting: input.submitting,
    },
    errorMessage,
    lockCountdown,
    onPrimary,
    primaryDisabled,
    primaryLabel,
    title: input.title,
    reasonLabel: input.reasonLabel,
    cancelLabel: input.cancelLabel,
    onCancel: input.onClose,
    isConfirming: input.submitting,
    labels: {
      approvalTitle: t('pos.orderDetail.approvalTitle'),
      approvalHint: t('pos.orderDetail.approvalHint'),
      pickApprover: t('pos.orderDetail.pickApprover'),
      emptyApprovers: t('pos.orderDetail.emptyApprovers'),
      backspace: t('pos.lock.backspace'),
      locked: t('pos.lock.lockedCountdown'),
    },
  };
}

export type PosOrderActionDialogViewModel = ReturnType<typeof usePosOrderActionDialog>;
