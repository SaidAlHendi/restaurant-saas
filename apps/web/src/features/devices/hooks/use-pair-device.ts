import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePairDeviceMutation } from '../../auth/auth.api.js';
import { apiErrorCode } from '../api-error-code.js';
import { writeStoredDevice, type StoredDevice } from '../device-key-storage.js';

export function usePairDevice(input: {
  onPaired: (device: StoredDevice) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pairDevice, { isLoading }] = usePairDeviceMutation();

  const onSubmit = async () => {
    setErrorMessage(null);
    const result = await pairDevice({ code });
    if ('error' in result) {
      const invalid = apiErrorCode(result.error) === 'PAIRING_CODE_INVALID';
      setErrorMessage(t(invalid ? 'devices.pair.invalidCode' : 'devices.pair.error'));
      return;
    }
    const stored: StoredDevice = {
      key: result.data.deviceKey,
      name: result.data.device.name,
      orgName: result.data.device.orgName,
      branchName: result.data.device.branchName,
    };
    writeStoredDevice(stored);
    input.onPaired(stored);
  };

  return {
    code,
    onCodeChange: (value: string) => {
      setCode(value);
      setErrorMessage(null);
    },
    canSubmit: code.replace(/[\s-]/g, '').length === 8,
    isLoading,
    errorMessage,
    onSubmit: () => {
      void onSubmit();
    },
    onCancel: input.onCancel,
    labels: {
      title: t('devices.pair.title'),
      description: t('devices.pair.description'),
      codeLabel: t('devices.pair.codeLabel'),
      submit: t('devices.pair.submit'),
      cancel: t('common.cancel'),
    },
  };
}

export type PairDeviceViewModel = ReturnType<typeof usePairDevice>;
