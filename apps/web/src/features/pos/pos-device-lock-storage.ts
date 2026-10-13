export const POS_DEVICE_LOCKED_STORAGE_KEY = 'pos.locked';

export function readPosDeviceLocked(): boolean {
  try {
    return window.localStorage.getItem(POS_DEVICE_LOCKED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writePosDeviceLocked(locked: boolean): void {
  try {
    if (locked) {
      window.localStorage.setItem(POS_DEVICE_LOCKED_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(POS_DEVICE_LOCKED_STORAGE_KEY);
    }
  } catch {
    // Storage blocked; in-memory lock still applies for this visit.
  }
}
