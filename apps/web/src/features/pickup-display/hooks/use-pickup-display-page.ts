import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { PublicDisplayOrder } from '@app/shared';

import { createChimePlayer } from '../../kds/kds-sound.js';
import { useGetPickupDisplayQuery } from '../pickup-display.api.js';
import { displayNumber, hasNewReadyOrder, readyKey } from '../pickup-display.utils.js';

const POLL_MS = 4000;

export function usePickupDisplayPage() {
  const { t } = useTranslation();
  const { orgSlug = '', branchSlug = '' } = useParams();
  const { data, isLoading, isError, error } = useGetPickupDisplayQuery(
    { orgSlug, branchSlug },
    { pollingInterval: POLL_MS, skip: orgSlug === '' || branchSlug === '' },
  );

  const chime = useMemo(() => createChimePlayer(), []);
  const [soundOn, setSoundOn] = useState(false);
  const previousRef = useRef<readonly PublicDisplayOrder[] | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    const previous = previousRef.current;
    previousRef.current = data.ready;
    // The first load never chimes: only orders that turn ready while the screen is open do.
    if (previous !== null && hasNewReadyOrder(previous, data.ready)) {
      chime.play();
    }
  }, [chime, data]);

  const onEnableSound = useCallback(() => {
    void chime.unlock().then((ok) => {
      setSoundOn(ok);
      if (ok) {
        chime.play();
      }
    });
  }, [chime]);

  const status = 'status' in (error ?? {}) ? (error as { status?: unknown }).status : undefined;

  return {
    isLoading,
    notFound: isError && status === 404,
    isError: isError && status !== 404,
    title: data?.branchName ?? '',
    orgName: data?.orgName ?? '',
    entries: (data?.ready ?? []).map((order) => ({
      key: readyKey(order),
      number: String(displayNumber(order)),
    })),
    soundOn,
    onEnableSound,
    labels: {
      heading: t('pickupDisplay.heading'),
      empty: t('pickupDisplay.empty'),
      enableSound: t('pickupDisplay.enableSound'),
      soundOn: t('pickupDisplay.soundOn'),
      notFound: t('pickupDisplay.notFound'),
      error: t('pickupDisplay.error'),
      loading: t('common.loading'),
    },
  };
}
