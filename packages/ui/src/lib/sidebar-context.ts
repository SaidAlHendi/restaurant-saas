import { createContext, useContext } from 'react';

export interface SidebarContextValue {
  /** Desktop sidebar shows icons only. */
  collapsed: boolean;
  /** Called after a mobile item is chosen so the sheet can close. */
  onNavigate?: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({ collapsed: false });

export function useSidebarContext(): SidebarContextValue {
  return useContext(SidebarContext);
}
