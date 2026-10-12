import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KDS_SETTINGS,
  kdsSettingsKey,
  loadKdsSettings,
  parseKdsSettings,
  saveKdsSettings,
} from './kds-settings.utils.js';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

describe('kds settings', () => {
  it('falls back to defaults for missing, broken or invalid values', () => {
    expect(parseKdsSettings(null)).toEqual(DEFAULT_KDS_SETTINGS);
    expect(parseKdsSettings('{not json')).toEqual(DEFAULT_KDS_SETTINGS);
    expect(
      parseKdsSettings(JSON.stringify({ amberMinutes: 20, redMinutes: 10, soundEnabled: true })),
    ).toEqual(DEFAULT_KDS_SETTINGS);
    expect(
      parseKdsSettings(JSON.stringify({ amberMinutes: 0, redMinutes: 5, soundEnabled: true })),
    ).toEqual(DEFAULT_KDS_SETTINGS);
  });

  it('round-trips per branch', () => {
    const storage = memoryStorage();
    const value = { amberMinutes: 1, redMinutes: 2, soundEnabled: false };
    saveKdsSettings('b1', value, storage);
    expect(storage.getItem(kdsSettingsKey('b1'))).not.toBeNull();
    expect(loadKdsSettings('b1', storage)).toEqual(value);
    expect(loadKdsSettings('b2', storage)).toEqual(DEFAULT_KDS_SETTINGS);
  });

  it('survives storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(loadKdsSettings('b1', throwing)).toEqual(DEFAULT_KDS_SETTINGS);
    expect(() => {
      saveKdsSettings('b1', DEFAULT_KDS_SETTINGS, throwing);
    }).not.toThrow();
  });
});
