import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../app/hooks.js';
import { authApi, useLogoutMutation, useSwitchOrgMutation } from '../../features/auth/auth.api.js';
import {
  clearSession,
  hydrateFromMe,
  setAccessToken,
} from '../../features/session/session.slice.js';
import {
  selectCan,
  selectSessionOrg,
  selectSessionOrgs,
  selectSessionUser,
} from '../../features/session/session.selectors.js';

export function useDashboardPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectSessionUser);
  const org = useAppSelector(selectSessionOrg);
  const orgs = useAppSelector(selectSessionOrgs);
  const canManageBranches = useAppSelector(selectCan('branches.manage'));
  const [switchOrg, { isLoading: switchingOrg }] = useSwitchOrgMutation();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  const onOrgChange = async (orgId: string) => {
    const result = await switchOrg({ orgId }).unwrap();
    dispatch(setAccessToken(result.accessToken));
    const me = await dispatch(authApi.endpoints.getMe.initiate(undefined)).unwrap();
    dispatch(hydrateFromMe(me));
  };

  const onLogout = async () => {
    try {
      await logout(undefined).unwrap();
    } finally {
      dispatch(clearSession());
      void navigate('/login', { replace: true });
    }
  };

  return {
    t,
    user,
    org,
    orgs,
    canManageBranches,
    switchingOrg,
    loggingOut,
    onOrgChange,
    onLogout,
  };
}
