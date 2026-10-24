import { describe, expect, it } from 'vitest';

import { localizedName } from './localized-name.js';

describe('localizedName', () => {
  it('picks the half matching the UI language', () => {
    expect(localizedName('بيت الشامي / Bait Al-Shami', 'ar')).toBe('بيت الشامي');
    expect(localizedName('بيت الشامي / Bait Al-Shami', 'en')).toBe('Bait Al-Shami');
    expect(localizedName('Bait Al-Shami / بيت الشامي', 'ar-SA')).toBe('بيت الشامي');
  });

  it('leaves single-language or unusual names alone', () => {
    expect(localizedName('Cafe Qahwa', 'ar')).toBe('Cafe Qahwa');
    expect(localizedName('A / B', 'en')).toBe('A / B');
    expect(localizedName('Mon / Tue / Wed', 'en')).toBe('Mon / Tue / Wed');
  });
});
