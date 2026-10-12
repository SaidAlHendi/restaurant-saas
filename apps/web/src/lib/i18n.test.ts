import { afterEach, describe, expect, it } from 'vitest';

import { i18n, initI18n, LANGUAGE_STORAGE_KEY, setAppLanguage } from './i18n.js';

describe('setAppLanguage', () => {
  afterEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('switches the language, flips the page direction and remembers the choice', async () => {
    await initI18n();
    await setAppLanguage('ar');
    expect(i18n.language).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');

    await setAppLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
