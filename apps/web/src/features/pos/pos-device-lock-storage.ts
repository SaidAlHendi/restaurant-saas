/** Legacy browser-wide flag. It trapped other users on the same browser, so it is ignored and removed. */
export const LEGACY_POS_DEVICE_LOCKED_STORAGE_KEY = 'pos.locked';

export function posDeviceLockedStorageKey(orgId: string): string {
  return `pos.locked.${orgId}`;
}

function removeLegacyFlag(): void {
  try {
    window.localStorage.removeItem(LEGACY_POS_DEVICE_LOCKED_STORAGE_KEY);
  } catch {
    // Storage blocked.
  }
}

/** The lock flag belongs to one restaurant on one device. */
export function readPosDeviceLocked(orgId: string | null | undefined): boolean {
  removeLegacyFlag();
  if (!orgId) {
    return false;
  }
  try {
    return window.localStorage.getItem(posDeviceLockedStorageKey(orgId)) === 'true';
  } catch {
    return false;
  }
}

export function writePosDeviceLocked(orgId: string | null | undefined, locked: boolean): void {
  removeLegacyFlag();
  if (!orgId) {
    return;
  }
  try {
    if (locked) {
      window.localStorage.setItem(posDeviceLockedStorageKey(orgId), 'true');
    } else {
      window.localStorage.removeItem(posDeviceLockedStorageKey(orgId));
    }
  } catch {
    // Storage blocked; in-memory lock still applies for this visit.
  }
}
