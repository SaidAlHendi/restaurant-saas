import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { readPosDeviceLocked } from '../pos-device-lock-storage.js';

/** While the device POS lock flag is set, keep the authenticated shell on `/pos`. */
export function usePosDeviceLockRedirect(): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!readPosDeviceLocked()) {
      return;
    }
    if (location.pathname.startsWith('/pos')) {
      return;
    }
    void navigate('/pos', { replace: true });
  }, [location.pathname, navigate]);
}
