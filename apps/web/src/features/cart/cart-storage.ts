import type { CartState } from './cart.types.js';

export function cartStorageKey(branchId: string): string {
  return `pos-cart:${branchId}`;
}

export function loadCartFromStorage(branchId: string): CartState | null {
  try {
    const raw = localStorage.getItem(cartStorageKey(branchId));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed as CartState;
  } catch {
    return null;
  }
}

export function saveCartToStorage(state: CartState): void {
  if (!state.branchId) {
    return;
  }
  localStorage.setItem(cartStorageKey(state.branchId), JSON.stringify(state));
}

export function clearCartStorage(branchId: string): void {
  localStorage.removeItem(cartStorageKey(branchId));
}
