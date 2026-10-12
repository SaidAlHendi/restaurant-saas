import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import {
  messageFromOrdersMutationError,
  parseOrdersApiErrorCode,
} from '../../orders/orders-api-errors.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import { applyDashboardBranchChange } from '../../session/apply-dashboard-branch-change.js';
import {
  selectCurrentBranchId,
  selectSessionBranches,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import {
  serverClockOffsetMs,
  shouldChime,
  shouldRefetchForEvent,
  splitBoardColumns,
} from '../kds-board.utils.js';
import {
  DEFAULT_KDS_SETTINGS,
  kdsSettingsSchema,
  loadKdsSettings,
  saveKdsSettings,
  type KdsSettings,
} from '../kds-settings.utils.js';
import { createChimePlayer } from '../kds-sound.js';
import { buildKdsCard, type KdsCardLabels, type KdsCardModel } from '../kds-view.utils.js';
import {
  useChangeKitchenItemStatusMutation,
  useGetKitchenBoardQuery,
  useMoveKitchenOrderMutation,
} from '../kds.api.js';
import { useNow } from './use-now.js';
import { useWakeLock } from './use-wake-lock.js';

const REFETCH_DEBOUNCE_MS = 300;

export function useKdsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const org = useAppSelector(selectSessionOrg);
  const branches = useAppSelector(selectSessionBranches);
  const branchId = useAppSelector(selectCurrentBranchId);
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const defaultLocale = org?.defaultLocale ?? 'en';

  const board = useGetKitchenBoardQuery(branchId ?? '', { skip: !branchId });
  const [moveOrder] = useMoveKitchenOrderMutation();
  const [changeItem] = useChangeKitchenItemStatusMutation();

  const [settings, setSettings] = useState<KdsSettings>(DEFAULT_KDS_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [pendingOrderIds, setPendingOrderIds] = useState<ReadonlySet<string>>(new Set());
  const chimeRef = useRef(createChimePlayer());
  const refetchTimer = useRef<number | undefined>(undefined);
  const boardDataRef = useRef(board.data);
  const settingsRef = useRef(settings);

  useEffect(() => {
    boardDataRef.current = board.data;
    settingsRef.current = settings;
  }, [board.data, settings]);

  useEffect(() => {
    if (branchId) {
      setSettings(loadKdsSettings(branchId));
    }
  }, [branchId]);

  useEffect(
    () => () => {
      window.clearTimeout(refetchTimer.current);
    },
    [],
  );

  const refetchBoard = useCallback(() => {
    window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(() => {
      dispatch(baseApi.util.invalidateTags(['KitchenBoard']));
    }, REFETCH_DEBOUNCE_MS);
  }, [dispatch]);

  const onEvent = useCallback(
    ({ payload }: RealtimeEvent) => {
      if (!branchId || payload.branchId !== branchId) {
        return;
      }
      if (shouldRefetchForEvent(boardDataRef.current, payload, branchId)) {
        refetchBoard();
      }
      if (settingsRef.current.soundEnabled && shouldChime(boardDataRef.current, payload)) {
        chimeRef.current.play();
      }
    },
    [branchId, refetchBoard],
  );

  const onResync = useCallback(() => {
    dispatch(baseApi.util.invalidateTags(['KitchenBoard']));
  }, [dispatch]);

  const realtime = useBranchRealtime({ branchId, onEvent, onResync });
  const canTap = realtime.isOnline;

  useWakeLock(true);
  const nowMs = useNow(1_000);

  const offsetMs = useMemo(
    () =>
      board.data && board.fulfilledTimeStamp !== undefined
        ? serverClockOffsetMs(board.data.serverTime, board.fulfilledTimeStamp)
        : 0,
    [board.data, board.fulfilledTimeStamp],
  );

  const labels: KdsCardLabels = useMemo(
    () => ({
      orderNumber: (n) => t('kds.card.orderNumber', { number: n }),
      type: (type) =>
        type === 'dine_in' ? t('pos.orderType.dineIn') : t('pos.orderType.takeaway'),
      table: (label) => t('kds.card.table', { label }),
      added: t('kds.card.added'),
      voided: t('kds.card.voided'),
      start: t('kds.card.start'),
      ready: t('kds.card.markReady'),
      awaitingPayment: t('kds.card.awaitingPayment'),
      readyForPickup: t('kds.card.readyForPickup'),
      age: (age) => t('kds.card.age', { age }),
    }),
    [t],
  );

  const columns = useMemo(() => {
    const split = splitBoardColumns(board.data?.orders ?? []);
    const input = { nowMs, offsetMs, settings, locale, defaultLocale, labels };
    return {
      placed: split.placed.map((o) => buildKdsCard(o, input)),
      preparing: split.preparing.map((o) => buildKdsCard(o, input)),
      ready: split.ready.map((o) => buildKdsCard(o, input)),
    };
  }, [board.data, nowMs, offsetMs, settings, locale, defaultLocale, labels]);

  const markPending = useCallback((orderId: string, pending: boolean) => {
    setPendingOrderIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(orderId);
      } else {
        next.delete(orderId);
      }
      return next;
    });
  }, []);

  const handleMutationError = useCallback(
    (error: unknown) => {
      if (parseOrdersApiErrorCode(error) === 'ORDER_VERSION_CONFLICT') {
        dispatch(baseApi.util.invalidateTags(['KitchenBoard']));
      }
      toast.error(messageFromOrdersMutationError(error, t));
    },
    [dispatch, t],
  );

  const onAdvance = useCallback(
    (card: KdsCardModel) => {
      if (!branchId || !card.next || !canTap) {
        return;
      }
      markPending(card.id, true);
      moveOrder({ branchId, orderId: card.id, to: card.next, expectedVersion: card.version })
        .unwrap()
        .catch(handleMutationError)
        .finally(() => {
          markPending(card.id, false);
        });
    },
    [branchId, canTap, handleMutationError, markPending, moveOrder],
  );

  const onToggleItem = useCallback(
    (card: KdsCardModel, itemId: string, isReady: boolean) => {
      if (!branchId || !canTap) {
        return;
      }
      markPending(card.id, true);
      changeItem({
        branchId,
        orderId: card.id,
        itemId,
        body: { to: isReady ? 'not_ready' : 'ready', expectedVersion: card.version },
      })
        .unwrap()
        .catch(handleMutationError)
        .finally(() => {
          markPending(card.id, false);
        });
    },
    [branchId, canTap, changeItem, handleMutationError, markPending],
  );

  const onEnableSound = useCallback(() => {
    void chimeRef.current.unlock().then((ok) => {
      setSoundUnlocked(ok);
      if (ok) {
        chimeRef.current.play();
      }
    });
  }, []);

  const updateSettings = useCallback(
    (next: KdsSettings) => {
      setSettings(next);
      if (branchId) {
        saveKdsSettings(branchId, next);
      }
    },
    [branchId],
  );

  const onToggleMute = useCallback(() => {
    updateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  }, [settings, updateSettings]);

  const [draft, setDraft] = useState({ amber: '', red: '' });
  useEffect(() => {
    if (settingsOpen) {
      setDraft({ amber: String(settings.amberMinutes), red: String(settings.redMinutes) });
    }
  }, [settingsOpen, settings.amberMinutes, settings.redMinutes]);

  const parsedDraft = kdsSettingsSchema.safeParse({
    amberMinutes: Number(draft.amber),
    redMinutes: Number(draft.red),
    soundEnabled: settings.soundEnabled,
  });

  const toCardProps = (card: KdsCardModel) => ({
    id: card.id,
    card: {
      orderNumberLabel: card.orderNumberLabel,
      typeLabel: card.typeLabel,
      subtitle: card.subtitle,
      ageLabel: card.ageLabel,
      ageLevel: card.ageLevel,
      ageAriaLabel: card.ageAriaLabel,
      note: card.note,
      addedLabel: card.addedLabel,
      voidedLabel: card.voidedLabel,
      statusNote: card.statusNote,
      pending: pendingOrderIds.has(card.id),
      actionLabel: card.actionLabel ?? undefined,
      actionDisabled: !canTap || pendingOrderIds.has(card.id),
      onAction: card.next
        ? () => {
            onAdvance(card);
          }
        : undefined,
      items: card.items.map((item) => ({
        ...item,
        onToggle:
          item.canToggle && canTap
            ? () => {
                onToggleItem(card, item.id, item.isReady);
              }
            : undefined,
      })),
    },
  });

  const branchName = branches.find((b) => b.id === branchId)?.name ?? t('pos.branchUnknown');

  return {
    branchName,
    isLoading: board.isLoading,
    isError: board.isError && !board.data,
    labels: {
      loading: t('common.loading'),
      loadError: t('kds.loadError'),
      title: t('kds.title'),
      emptyColumn: t('kds.emptyColumn'),
      disconnected: t('kds.disconnected'),
      mute: settings.soundEnabled ? t('kds.sound.mute') : t('kds.sound.unmute'),
      settings: t('kds.settings.open'),
      enableSoundTitle: t('kds.sound.enableTitle'),
      enableSoundDescription: t('kds.sound.enableDescription'),
      enableSound: t('kds.sound.enable'),
      skipSound: t('kds.sound.skip'),
    },
    columns: [
      {
        key: 'placed',
        status: 'new',
        title: t('kds.columns.new'),
        cards: columns.placed.map(toCardProps),
      },
      {
        key: 'preparing',
        status: 'preparing',
        title: t('kds.columns.preparing'),
        cards: columns.preparing.map(toCardProps),
      },
      {
        key: 'ready',
        status: 'ready',
        title: t('kds.columns.ready'),
        cards: columns.ready.map(toCardProps),
      },
    ] as const,
    showDisconnected: !realtime.isOnline && realtime.state !== 'connecting',
    soundEnabled: settings.soundEnabled,
    onToggleMute,
    showSoundPrompt: settings.soundEnabled && !soundUnlocked,
    onEnableSound,
    onSkipSound: () => {
      updateSettings({ ...settings, soundEnabled: false });
    },
    branchSwitcher: {
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      value: branchId,
      onValueChange: (next: string) => {
        if (org && next !== branchId) {
          applyDashboardBranchChange(dispatch, org.id, next);
        }
      },
      ariaLabel: t('dashboard.branchSwitcherLabel'),
      placeholder: t('dashboard.selectBranch'),
    },
    settingsSheet: {
      open: settingsOpen,
      onOpenChange: setSettingsOpen,
      title: t('kds.settings.title'),
      description: t('kds.settings.description'),
      amberLabel: t('kds.settings.amber'),
      redLabel: t('kds.settings.red'),
      amberValue: draft.amber,
      redValue: draft.red,
      onAmberChange: (value: string) => {
        setDraft((d) => ({ ...d, amber: value }));
      },
      onRedChange: (value: string) => {
        setDraft((d) => ({ ...d, red: value }));
      },
      invalidMessage: parsedDraft.success ? null : t('kds.settings.invalid'),
      saveLabel: t('kds.settings.save'),
      saveDisabled: !parsedDraft.success,
      onSave: () => {
        if (parsedDraft.success) {
          updateSettings(parsedDraft.data);
          setSettingsOpen(false);
        }
      },
    },
  };
}

export type KdsPageViewModel = ReturnType<typeof useKdsPage>;
