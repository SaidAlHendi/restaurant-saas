import {
  DEFAULT_DISPLAY_ITEM_STEP,
  DEFAULT_DISPLAY_TOTAL_STEP,
  exchangeRateSchema,
  type MoneyDisplay,
  type OrgSettingsResponse,
  type PatchOrgSettingsBody,
} from '@app/shared';

/** Currencies offered as display currency, most likely first. The saved one is always added. */
export const DISPLAY_CURRENCY_CHOICES = [
  'SYP',
  'LBP',
  'IQD',
  'TRY',
  'EGP',
  'JOD',
  'SAR',
  'AED',
  'KWD',
  'QAR',
  'BHD',
  'OMR',
  'USD',
  'EUR',
  'GBP',
] as const;

/** After this many days without an update the rate is flagged as possibly out of date. */
export const EXCHANGE_RATE_STALE_DAYS = 7;

export type CurrencySettingsForm = {
  /** Equal to the base currency = display currency off. */
  displayCurrency: string;
  /** Raw text of the rate field. */
  rateText: string;
  itemStep: number;
  totalStep: number;
};

type SavedCurrencySettings = Pick<
  OrgSettingsResponse,
  'defaultCurrency' | 'displayCurrency' | 'exchangeRate' | 'displayItemStep' | 'displayTotalStep'
>;

export function currencyFormFromSettings(saved: SavedCurrencySettings): CurrencySettingsForm {
  return {
    displayCurrency: saved.displayCurrency ?? saved.defaultCurrency,
    rateText: saved.exchangeRate === null ? '' : String(saved.exchangeRate),
    itemStep: saved.displayCurrency === null ? DEFAULT_DISPLAY_ITEM_STEP : saved.displayItemStep,
    totalStep: saved.displayCurrency === null ? DEFAULT_DISPLAY_TOTAL_STEP : saved.displayTotalStep,
  };
}

/** Rate typed by the owner, or null when it is empty or not a usable number. */
export function parseExchangeRate(text: string): number | null {
  const normalized = text.trim().replace(/,/g, '');
  if (normalized.length === 0 || !/^\d+(\.\d{1,6})?$/.test(normalized)) {
    return null;
  }
  const parsed = exchangeRateSchema.safeParse(Number(normalized));
  return parsed.success ? parsed.data : null;
}

export type CurrencyFormResult =
  | { ok: true; patch: PatchOrgSettingsBody; display: MoneyDisplay | null }
  | { ok: false; messageKey: string };

/** The settings patch for the form, or the message to show when the rate is missing or invalid. */
export function currencyFormResult(
  form: CurrencySettingsForm,
  baseCurrency: string,
): CurrencyFormResult {
  if (form.displayCurrency === baseCurrency) {
    return { ok: true, patch: { displayCurrency: null }, display: null };
  }
  const rate = parseExchangeRate(form.rateText);
  if (rate === null) {
    return { ok: false, messageKey: 'settings.currency.rateInvalid' };
  }
  return {
    ok: true,
    patch: {
      displayCurrency: form.displayCurrency,
      exchangeRate: rate,
      displayItemStep: form.itemStep,
      displayTotalStep: form.totalStep,
    },
    display: {
      currency: form.displayCurrency,
      rate,
      itemStep: form.itemStep,
      totalStep: form.totalStep,
    },
  };
}

export function isCurrencyFormDirty(form: CurrencySettingsForm, saved: SavedCurrencySettings): boolean {
  const initial = currencyFormFromSettings(saved);
  if (form.displayCurrency !== initial.displayCurrency) {
    return true;
  }
  if (form.displayCurrency === saved.defaultCurrency) {
    return false;
  }
  return (
    form.rateText.trim() !== initial.rateText ||
    form.itemStep !== initial.itemStep ||
    form.totalStep !== initial.totalStep
  );
}

export function isExchangeRateStale(updatedAt: string | null, now: Date): boolean {
  if (updatedAt === null) {
    return false;
  }
  const ageMs = now.getTime() - new Date(updatedAt).getTime();
  return ageMs > EXCHANGE_RATE_STALE_DAYS * 24 * 60 * 60 * 1000;
}
