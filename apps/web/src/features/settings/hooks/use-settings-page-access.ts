import type { PermissionKey } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { selectCan, selectPermissions } from '../../session/session.selectors.js';
import { defaultSettingsPath } from '../settings-tabs.utils.js';

export function useSettingsPageAccess(permission: PermissionKey) {
  const allowed = useAppSelector(selectCan(permission));
  const permissions = useAppSelector(selectPermissions);
  const redirectTo = allowed ? null : defaultSettingsPath(permissions);
  return { allowed, redirectTo };
}
