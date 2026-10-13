import { createContext, useContext } from 'react';

export type PosLockContextValue = {
  requestLock: () => void;
};

export const PosLockContext = createContext<PosLockContextValue | null>(null);

export function usePosLockRequest(): () => void {
  const ctx = useContext(PosLockContext);
  if (ctx === null) {
    return () => {
      /* POS routes should always provide context */
    };
  }
  return ctx.requestLock;
}
