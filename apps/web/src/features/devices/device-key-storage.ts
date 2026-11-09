/**
 * The key that links this browser to one restaurant branch (see `/v1/auth/device/*`). It identifies the
 * device only; staff still sign in with their own PIN. Cleared when the device is unlinked or revoked.
 */
export const DEVICE_STORAGE_KEY = 'rs.device';

export type StoredDevice = {
  key: string;
  name: string;
  orgName: string;
  branchName: string;
};

function isStoredDevice(value: unknown): value is StoredDevice {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v['key'] === 'string' &&
    v['key'].length >= 16 &&
    typeof v['name'] === 'string' &&
    typeof v['orgName'] === 'string' &&
    typeof v['branchName'] === 'string'
  );
}

export function readStoredDevice(): StoredDevice | null {
  try {
    const raw = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isStoredDevice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredDevice(device: StoredDevice): void {
  try {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(device));
  } catch {
    // Storage blocked: the device simply stays unlinked.
  }
}

export function clearStoredDevice(): void {
  try {
    window.localStorage.removeItem(DEVICE_STORAGE_KEY);
  } catch {
    // Storage blocked.
  }
}
