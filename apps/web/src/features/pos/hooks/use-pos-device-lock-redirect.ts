import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { selectSessionOrg } from '../../session/session.selectors.js';
import { readPosDeviceLocked } from '../pos-device-lock-storage.js';

/** While this restaurant's device POS lock flag is set, keep the authenticated shell on `/pos`. */
export function usePosDeviceLockRedirect(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const orgId = useAppSelector(selectSessionOrg)?.id;

  useEffect(() => {
    if (!readPosDeviceLocked(orgId)) {
      return;
    }
    if (location.pathname.startsWith('/pos')) {
      return;
    }
    void navigate('/pos', { replace: true });
  }, [location.pathname, navigate, orgId]);
}
