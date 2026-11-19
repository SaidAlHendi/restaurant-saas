import { describe, expect, it } from 'vitest';

import {
  currencyFormFromSettings,
  currencyFormResult,
  isCurrencyFormDirty,
  isExchangeRateStale,
  parseExchangeRate,
  withBaseCurrency,
  withDisplayCurrency,
} from './currency-settings-form.utils.js';

const off = {
  defaultCurrency: 'USD',
  displayCurrency: null,
  exchangeRate: null,
  displayItemStep: 100,
  displayTotalStep: 500,
};
const on = { ...off, displayCurrency: 'SYP', exchangeRate: 13000 };

describe('parseExchangeRate', () => {
  it('accepts plain numbers and thousands separators', () => {
    expect(parseExchangeRate('13000')).toBe(13000);
    expect(parseExchangeRate(' 13,000.5 ')).toBe(13000.5);
  });

  it('rejects empty, zero, negative and non-numeric text', () => {
    for (const text of ['', '0', '-5', 'abc', '1.1234567']) {
      expect(parseExchangeRate(text)).toBeNull();
    }
  });
});

describe('currencyFormResult', () => {
  it('turns the display currency off when it equals the base currency', () => {
    const form = currencyFormFromSettings(off);
    expect(currencyFormResult(form, 'USD')).toEqual({
      ok: true,
      patch: { displayCurrency: null },
      display: null,
    });
  });

  it('requires a rate for another currency', () => {
    const form = { ...currencyFormFromSettings(off), displayCurrency: 'SYP' };
    expect(currencyFormResult(form, 'USD')).toEqual({
      ok: false,
      messageKey: 'settings.currency.rateInvalid',
    });
  });

  it('builds the patch with rate and rounding steps', () => {
    const form = { ...currencyFormFromSettings(off), displayCurrency: 'SYP', rateText: '13000' };
    const result = currencyFormResult(form, 'USD');
    expect(result.ok && result.patch).toEqual({
      displayCurrency: 'SYP',
      exchangeRate: 13000,
      displayItemStep: 100,
      displayTotalStep: 500,
    });
  });
});

describe('withDisplayCurrency', () => {
  it('starts a small-number currency without rounding and an empty rate', () => {
    const form = withDisplayCurrency(currencyFormFromSettings(off), 'EUR', off);
    expect(form).toMatchObject({ displayCurrency: 'EUR', rateText: '', itemStep: 0, totalStep: 0 });
  });

  it('starts a large-number currency with rounding to notes', () => {
    const form = withDisplayCurrency(currencyFormFromSettings(off), 'SYP', off);
    expect(form).toMatchObject({ itemStep: 100, totalStep: 500 });
  });

  it('brings back the saved rate and rounding for the saved currency', () => {
    const saved = { ...on, displayItemStep: 1000, displayTotalStep: 5000 };
    const away = withDisplayCurrency(currencyFormFromSettings(saved), 'EUR', saved);
    expect(withDisplayCurrency(away, 'SYP', saved)).toEqual(currencyFormFromSettings(saved));
  });
});

describe('withBaseCurrency', () => {
  it('switches the display currency off and puts the new base in the patch', () => {
    const form = withBaseCurrency(currencyFormFromSettings(on), 'EUR');
    expect(isCurrencyFormDirty(form, on)).toBe(true);
    expect(currencyFormResult(form, 'USD')).toEqual({
      ok: true,
      patch: { defaultCurrency: 'EUR', displayCurrency: null },
      display: null,
    });
  });

  it('sends the new base together with a new display currency and rate', () => {
    const base = withBaseCurrency(currencyFormFromSettings(off), 'EUR');
    const form = { ...withDisplayCurrency(base, 'SYP', off), rateText: '14000' };
    const result = currencyFormResult(form, 'USD');
    expect(result.ok && result.patch).toEqual({
      defaultCurrency: 'EUR',
      displayCurrency: 'SYP',
      exchangeRate: 14000,
      displayItemStep: 100,
      displayTotalStep: 500,
    });
  });
});

describe('isCurrencyFormDirty', () => {
  it('is clean right after loading', () => {
    expect(isCurrencyFormDirty(currencyFormFromSettings(off), off)).toBe(false);
    expect(isCurrencyFormDirty(currencyFormFromSettings(on), on)).toBe(false);
  });

  it('is dirty when the rate or a step changes', () => {
    const form = currencyFormFromSettings(on);
    expect(isCurrencyFormDirty({ ...form, rateText: '13500' }, on)).toBe(true);
    expect(isCurrencyFormDirty({ ...form, totalStep: 1000 }, on)).toBe(true);
  });
});

describe('isExchangeRateStale', () => {
  const now = new Date('2026-11-11T12:00:00.000Z');

  it('flags a rate older than 7 days', () => {
    expect(isExchangeRateStale('2026-11-03T11:00:00.000Z', now)).toBe(true);
    expect(isExchangeRateStale('2026-11-05T12:00:00.000Z', now)).toBe(false);
    expect(isExchangeRateStale(null, now)).toBe(false);
  });
});
