import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import { useAppSelector } from '../../../app/hooks.js';
import { formatMoney, intlLocaleForUi } from '../../../lib/money.js';
import { useListBranchesQuery, usePatchBranchMutation } from '../../branches/branches.api.js';
import { showMenuApiError } from '../../menu/show-menu-api-error.js';
import { selectCurrentBranchId, selectSessionOrg } from '../../session/session.selectors.js';
import { branchReceiptPreviewHtml } from '../branch-receipt-preview.utils.js';
import { filterTimezoneOptions } from '../branch-timezone.utils.js';
import { parseTaxPercentInput, taxBpToPercentInput } from '../tax-rate.utils.js';

export function useBranchSettingsPage() {
  const { t, i18n } = useTranslation();
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const uiLocale = intlLocaleForUi(i18n.language);
  const { data, isLoading, isError } = useListBranchesQuery(undefined);
  const [patchBranch, patchState] = usePatchBranchMutation();

  const branch = useMemo(
    () => data?.items.find((b) => b.id === branchId),
    [branchId, data?.items],
  );

  const [payBeforeSend, setPayBeforeSend] = useState(false);
  const [acceptsCard, setAcceptsCard] = useState(true);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [dayStartHour, setDayStartHour] = useState('4');
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [taxPercent, setTaxPercent] = useState('0');
  const [taxErrorKey, setTaxErrorKey] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  useEffect(() => {
    if (branch) {
      setPayBeforeSend(branch.payBeforeSend);
      setAcceptsCard(branch.acceptsCard);
      setTaxInclusive(branch.taxInclusive);
      setDayStartHour(String(branch.dayStartHour));
      setTimezone(branch.timezone);
      setTaxPercent(taxBpToPercentInput(branch.taxRateBp));
      setAddress(branch.address ?? '');
      setReceiptHeader(branch.receiptHeader ?? '');
      setReceiptFooter(branch.receiptFooter ?? '');
      setTaxErrorKey(null);
    }
  }, [branch]);

  const timezoneOptions = useMemo(
    () => filterTimezoneOptions(timezoneQuery),
    [timezoneQuery],
  );

  const dirty = useMemo(() => {
    if (!branch) {
      return false;
    }
    const parsedTax = parseTaxPercentInput(taxPercent);
    const taxBp = parsedTax.ok ? parsedTax.bp : branch.taxRateBp;
    const hour = Number(dayStartHour);
    return (
      payBeforeSend !== branch.payBeforeSend ||
      acceptsCard !== branch.acceptsCard ||
      taxInclusive !== branch.taxInclusive ||
      timezone !== branch.timezone ||
      taxBp !== branch.taxRateBp ||
      hour !== branch.dayStartHour ||
      address.trim() !== (branch.address ?? '') ||
      receiptHeader.trim() !== (branch.receiptHeader ?? '') ||
      receiptFooter.trim() !== (branch.receiptFooter ?? '')
    );
  }, [
    acceptsCard,
    address,
    branch,
    dayStartHour,
    payBeforeSend,
    receiptFooter,
    receiptHeader,
    taxInclusive,
    taxPercent,
    timezone,
  ]);

  const receiptPreviewHtml = useMemo(() => {
    if (!branch) {
      return '';
    }
    const parsedTax = parseTaxPercentInput(taxPercent);
    const taxRateBp = parsedTax.ok ? parsedTax.bp : branch.taxRateBp;
    return branchReceiptPreviewHtml({
      branchName: branch.name,
      currency: branch.currency,
      taxRateBp,
      taxInclusive,
      timezone,
      receiptHeader: receiptHeader.trim().length > 0 ? receiptHeader.trim() : null,
      receiptFooter: receiptFooter.trim().length > 0 ? receiptFooter.trim() : null,
      address: address.trim().length > 0 ? address.trim() : null,
      locale: uiLocale,
      formatMinor: (minor) => formatMoney(minor, branch.currency, uiLocale),
      labels: {
        subtotal: t('pos.totals.subtotal'),
        tax: t('pos.totals.tax'),
        taxInclusiveSuffix: t('settings.branch.receiptTaxInclusive'),
        total: t('pos.totals.total'),
        orderNumber: t('settings.branch.receiptOrderNumber'),
        dineIn: t('pos.orderType.dineIn'),
        takeaway: t('pos.orderType.takeaway'),
        paymentMethodCash: t('settings.branch.receiptCash'),
        paymentMethodCard: t('settings.branch.receiptCard'),
        paymentMethodOther: t('settings.branch.receiptOther'),
        tendered: t('settings.branch.receiptTendered'),
        change: t('settings.branch.receiptChange'),
      },
    });
  }, [
    address,
    branch,
    receiptFooter,
    receiptHeader,
    t,
    taxInclusive,
    taxPercent,
    timezone,
    uiLocale,
  ]);

  const onSave = useCallback(async () => {
    if (!branchId) {
      return;
    }
    const parsedTax = parseTaxPercentInput(taxPercent);
    if (!parsedTax.ok) {
      setTaxErrorKey('settings.branch.taxInvalid');
      return;
    }
    const hour = Number(dayStartHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      setTaxErrorKey('settings.branch.dayStartInvalid');
      return;
    }
    setTaxErrorKey(null);
    const result = await patchBranch({
      branchId,
      body: {
        payBeforeSend,
        acceptsCard,
        taxInclusive,
        taxRateBp: parsedTax.bp,
        dayStartHour: hour,
        timezone,
        address: address.trim(),
        receiptHeader: receiptHeader.trim(),
        receiptFooter: receiptFooter.trim(),
      },
    });
    if ('error' in result) {
      showMenuApiError(result.error, t);
      return;
    }
    toast.success(t('settings.branch.saved'));
  }, [
    acceptsCard,
    address,
    branchId,
    dayStartHour,
    patchBranch,
    payBeforeSend,
    receiptFooter,
    receiptHeader,
    t,
    taxInclusive,
    taxPercent,
    timezone,
  ]);

  return {
    isLoading,
    isError,
    branchName: branch?.name ?? '',
    payBeforeSend,
    onPayBeforeSendChange: setPayBeforeSend,
    acceptsCard,
    onAcceptsCardChange: setAcceptsCard,
    taxInclusive,
    onTaxInclusiveChange: setTaxInclusive,
    dayStartHour,
    onDayStartHourChange: setDayStartHour,
    timezone,
    onTimezoneChange: setTimezone,
    timezoneQuery,
    onTimezoneQueryChange: setTimezoneQuery,
    timezoneOptions,
    taxPercent,
    onTaxPercentChange: (value: string) => {
      setTaxPercent(value);
      setTaxErrorKey(null);
    },
    taxError: taxErrorKey ? t(taxErrorKey) : null,
    address,
    onAddressChange: setAddress,
    receiptHeader,
    onReceiptHeaderChange: setReceiptHeader,
    receiptFooter,
    onReceiptFooterChange: setReceiptFooter,
    receiptPreviewHtml,
    currency: branch?.currency ?? org?.defaultCurrency ?? '',
    dirty,
    saving: patchState.isLoading,
    onSave: () => {
      void onSave();
    },
    labels: {
      title: t('settings.branch.title'),
      description: t('settings.branch.description'),
      payBeforeSend: t('settings.branch.payBeforeSend'),
      payBeforeSendHint: t('settings.branch.payBeforeSendHint'),
      acceptsCard: t('settings.branch.acceptsCard'),
      acceptsCardHint: t('settings.branch.acceptsCardHint'),
      taxPercent: t('settings.branch.taxPercent'),
      taxPercentHint: t('settings.branch.taxPercentHint'),
      taxInclusive: t('settings.branch.taxInclusive'),
      taxInclusiveHint: t('settings.branch.taxInclusiveHint'),
      dayStartHour: t('settings.branch.dayStartHour'),
      dayStartHourHint: t('settings.branch.dayStartHourHint'),
      timezone: t('settings.branch.timezone'),
      address: t('settings.branch.address'),
      receiptHeader: t('settings.branch.receiptHeader'),
      receiptFooter: t('settings.branch.receiptFooter'),
      receiptPreview: t('settings.branch.receiptPreview'),
      taxDayNote: t('settings.branch.taxDayNote'),
      save: t('settings.branch.save'),
      loadError: t('settings.branch.loadError'),
      loading: t('common.loading'),
    },
  };
}

export type BranchSettingsPageViewModel = ReturnType<typeof useBranchSettingsPage>;
