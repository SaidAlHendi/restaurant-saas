import { cartStateSchema, type StoredCartState } from './cart.schema.js';

export function cartStorageKey(branchId: string): string {
  return `pos-cart:${branchId}`;
}

export function loadCartFromStorage(branchId: string): StoredCartState | null {
  try {
    const raw = localStorage.getItem(cartStorageKey(branchId));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const result = cartStateSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    if (result.data.branchId !== branchId) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export function saveCartToStorage(state: StoredCartState): void {
  try {
    localStorage.setItem(cartStorageKey(state.branchId), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function clearCartStorage(branchId: string): void {
  try {
    localStorage.removeItem(cartStorageKey(branchId));
  } catch {
    /* ignore */
  }
}
