/** localStorage key for the collapsed (icons only) desktop sidebar. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'app.sidebarCollapsed';

/** Saved choice first; otherwise collapse on narrow screens (tablets running the POS or KDS). */
export function readSidebarCollapsed(viewportWidth: number): boolean {
  try {
    const value = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }
  } catch {
    // Storage blocked: fall through to the width default.
  }
  return viewportWidth < 1280;
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // The choice still applies for this visit.
  }
}

export type ShellNavItem = { id: string; to: string; end: boolean };

/** The nav item that owns `pathname` (longest match wins, `end` items match exactly). */
export function activeNavItemId(items: ShellNavItem[], pathname: string): string | null {
  let best: ShellNavItem | null = null;
  for (const item of items) {
    const matches = item.end
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`);
    if (matches && (best === null || item.to.length > best.to.length)) {
      best = item;
    }
  }
  return best?.id ?? null;
}
