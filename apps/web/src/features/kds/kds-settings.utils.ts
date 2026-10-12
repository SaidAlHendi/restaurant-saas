import { z } from 'zod';

export const kdsSettingsSchema = z
  .object({
    amberMinutes: z.number().int().min(1).max(240),
    redMinutes: z.number().int().min(1).max(240),
    soundEnabled: z.boolean(),
  })
  .refine((s) => s.redMinutes > s.amberMinutes, { path: ['redMinutes'] });

export type KdsSettings = z.infer<typeof kdsSettingsSchema>;

export const DEFAULT_KDS_SETTINGS: KdsSettings = {
  amberMinutes: 10,
  redMinutes: 20,
  soundEnabled: true,
};

export function kdsSettingsKey(branchId: string): string {
  return `rs.kds.${branchId}`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Parses stored settings; anything invalid falls back to the defaults. */
export function parseKdsSettings(raw: string | null): KdsSettings {
  if (raw === null) {
    return DEFAULT_KDS_SETTINGS;
  }
  try {
    const parsed = kdsSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_KDS_SETTINGS;
  } catch {
    return DEFAULT_KDS_SETTINGS;
  }
}

export function loadKdsSettings(
  branchId: string,
  storage: StorageLike | null = defaultStorage(),
): KdsSettings {
  try {
    return parseKdsSettings(storage?.getItem(kdsSettingsKey(branchId)) ?? null);
  } catch {
    return DEFAULT_KDS_SETTINGS;
  }
}

export function saveKdsSettings(
  branchId: string,
  settings: KdsSettings,
  storage: StorageLike | null = defaultStorage(),
): void {
  try {
    storage?.setItem(kdsSettingsKey(branchId), JSON.stringify(settings));
  } catch {
    /* storage full or blocked: keep the in-memory value */
  }
}
