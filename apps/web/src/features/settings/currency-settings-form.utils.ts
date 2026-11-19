import {
  defaultDisplaySteps,
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
  /** Currency prices are saved in. Only editable while the restaurant has no orders. */
  baseCurrency: string;
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
    baseCurrency: saved.defaultCurrency,
    displayCurrency: saved.displayCurrency ?? saved.defaultCurrency,
    rateText: saved.exchangeRate === null ? '' : String(saved.exchangeRate),
    itemStep: saved.displayItemStep,
    totalStep: saved.displayTotalStep,
  };
}

/** The form after the owner picks another base currency: the display currency switches off. */
export function withBaseCurrency(form: CurrencySettingsForm, baseCurrency: string): CurrencySettingsForm {
  return { ...form, baseCurrency, displayCurrency: baseCurrency, rateText: '' };
}

/**
 * The form after the owner picks a display currency. A rate and its rounding belong to one
 * currency pair: the saved pair comes back as saved, any other starts empty with fitting rounding.
 */
export function withDisplayCurrency(
  form: CurrencySettingsForm,
  displayCurrency: string,
  saved: SavedCurrencySettings,
): CurrencySettingsForm {
  const isSavedPair =
    form.baseCurrency === saved.defaultCurrency &&
    displayCurrency === saved.displayCurrency &&
    saved.exchangeRate !== null;
  if (isSavedPair) {
    return {
      ...form,
      displayCurrency,
      rateText: String(saved.exchangeRate),
      itemStep: saved.displayItemStep,
      totalStep: saved.displayTotalStep,
    };
  }
  return { ...form, displayCurrency, rateText: '', ...defaultDisplaySteps(displayCurrency) };
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

/**
 * The settings patch for the form, or the message to show when the rate is missing or invalid.
 * `savedBaseCurrency` is the base currency on the server; the patch only names a new one.
 */
export function currencyFormResult(
  form: CurrencySettingsForm,
  savedBaseCurrency: string,
): CurrencyFormResult {
  const basePatch: PatchOrgSettingsBody =
    form.baseCurrency === savedBaseCurrency ? {} : { defaultCurrency: form.baseCurrency };
  if (form.displayCurrency === form.baseCurrency) {
    return { ok: true, patch: { ...basePatch, displayCurrency: null }, display: null };
  }
  const rate = parseExchangeRate(form.rateText);
  if (rate === null) {
    return { ok: false, messageKey: 'settings.currency.rateInvalid' };
  }
  return {
    ok: true,
    patch: {
      ...basePatch,
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
  if (
    form.baseCurrency !== initial.baseCurrency ||
    form.displayCurrency !== initial.displayCurrency
  ) {
    return true;
  }
  if (form.displayCurrency === form.baseCurrency) {
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
