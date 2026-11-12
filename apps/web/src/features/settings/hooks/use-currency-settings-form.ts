import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DISPLAY_ROUNDING_STEPS,
  currencyDigits,
  formatMoney,
  formatMoneyForDisplay,
  type OrgSettingsResponse,
} from '@app/shared';

import { intlLocaleForUi } from '../../../lib/money.js';
import {
  DISPLAY_CURRENCY_CHOICES,
  currencyFormFromSettings,
  currencyFormResult,
  isCurrencyFormDirty,
  isExchangeRateStale,
  withBaseCurrency,
  withDisplayCurrency,
  type CurrencySettingsForm,
} from '../currency-settings-form.utils.js';

const EMPTY_FORM: CurrencySettingsForm = {
  baseCurrency: '',
  displayCurrency: '',
  rateText: '',
  itemStep: 0,
  totalStep: 0,
};

/** Form state for the Currency section of the restaurant settings page. */
export function useCurrencySettingsForm(data: OrgSettingsResponse | undefined) {
  const { t, i18n } = useTranslation();
  const uiLocale = intlLocaleForUi(i18n.language);
  const [form, setForm] = useState<CurrencySettingsForm>(EMPTY_FORM);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm(currencyFormFromSettings(data));
      setErrorKey(null);
    }
  }, [data]);

  const savedBaseCurrency = data?.defaultCurrency ?? '';
  const baseCurrency = form.baseCurrency;
  const baseCurrencyLocked = data?.baseCurrencyLocked ?? true;
  const converting = data !== undefined && form.displayCurrency !== baseCurrency;
  const result = useMemo(
    () => currencyFormResult(form, savedBaseCurrency),
    [form, savedBaseCurrency],
  );

  const baseCurrencyOptions = useMemo(() => {
    const codes = new Set<string>([savedBaseCurrency, ...DISPLAY_CURRENCY_CHOICES]);
    codes.delete('');
    return [...codes].map((code) => ({ value: code, label: code }));
  }, [savedBaseCurrency]);

  const currencyOptions = useMemo(() => {
    const codes = new Set<string>([baseCurrency, ...DISPLAY_CURRENCY_CHOICES]);
    if (data?.displayCurrency) {
      codes.add(data.displayCurrency);
    }
    codes.delete('');
    return [...codes].map((code) => ({
      value: code,
      label: code === baseCurrency ? t('settings.currency.sameAsBase', { currency: code }) : code,
    }));
  }, [baseCurrency, data?.displayCurrency, t]);

  const stepOptions = DISPLAY_ROUNDING_STEPS.map((step) => ({
    value: String(step),
    label:
      step === 0
        ? t('settings.currency.noRounding')
        : new Intl.NumberFormat(uiLocale).format(step),
  }));

  // One whole unit of the base currency x10, e.g. "10.00 USD", as the sample price.
  const sampleMinor = 10 * 10 ** currencyDigits(baseCurrency || 'USD');
  const preview =
    converting && result.ok && result.display
      ? t('settings.currency.preview', {
          base: formatMoney(sampleMinor, baseCurrency, uiLocale),
          price: formatMoneyForDisplay(sampleMinor, baseCurrency, uiLocale, result.display, 'item'),
          total: formatMoneyForDisplay(sampleMinor, baseCurrency, uiLocale, result.display, 'total'),
        })
      : null;

  const savedRateStale =
    data !== undefined &&
    data.displayCurrency !== null &&
    isExchangeRateStale(data.exchangeRateUpdatedAt, new Date());

  return {
    dirty: data !== undefined && isCurrencyFormDirty(form, data),
    /** Call before saving: returns the patch, or null after showing the field error. */
    validate: () => {
      if (!result.ok) {
        setErrorKey(result.messageKey);
        return null;
      }
      setErrorKey(null);
      return result.patch;
    },
    view: {
      baseCurrency,
      baseCurrencyLocked,
      baseCurrencyOptions,
      onBaseCurrencyChange: (value: string) => {
        setForm((prev) => withBaseCurrency(prev, value));
        setErrorKey(null);
      },
      displayCurrency: form.displayCurrency,
      onDisplayCurrencyChange: (value: string) => {
        if (data) {
          setForm((prev) => withDisplayCurrency(prev, value, data));
        }
        setErrorKey(null);
      },
      currencyOptions,
      converting,
      rateText: form.rateText,
      onRateChange: (value: string) => {
        setForm((prev) => ({ ...prev, rateText: value }));
        setErrorKey(null);
      },
      rateError: errorKey ? t(errorKey) : null,
      itemStep: String(form.itemStep),
      onItemStepChange: (value: string) => {
        setForm((prev) => ({ ...prev, itemStep: Number(value) }));
      },
      totalStep: String(form.totalStep),
      onTotalStepChange: (value: string) => {
        setForm((prev) => ({ ...prev, totalStep: Number(value) }));
      },
      stepOptions,
      preview,
      rateUpdatedLabel:
        data?.displayCurrency && data.exchangeRateUpdatedAt
          ? t('settings.currency.rateUpdated', {
              date: new Intl.DateTimeFormat(uiLocale, { dateStyle: 'medium' }).format(
                new Date(data.exchangeRateUpdatedAt),
              ),
            })
          : null,
      rateStaleWarning: savedRateStale ? t('settings.currency.rateStale') : null,
      labels: {
        title: t('settings.currency.title'),
        description: t('settings.currency.description'),
        baseCurrency: t('settings.currency.baseCurrency'),
        baseCurrencyHint: baseCurrencyLocked
          ? t('settings.currency.baseCurrencyLockedHint')
          : t('settings.currency.baseCurrencyHint'),
        displayCurrency: t('settings.currency.displayCurrency'),
        displayCurrencyHint: t('settings.currency.displayCurrencyHint'),
        rate: t('settings.currency.rate', {
          base: baseCurrency,
          display: form.displayCurrency,
        }),
        rateHint: t('settings.currency.rateHint'),
        itemStep: t('settings.currency.itemStep'),
        itemStepHint: t('settings.currency.itemStepHint'),
        totalStep: t('settings.currency.totalStep'),
        totalStepHint: t('settings.currency.totalStepHint'),
      },
    },
  };
}

export type CurrencySettingsSectionViewModel = ReturnType<typeof useCurrencySettingsForm>['view'];
