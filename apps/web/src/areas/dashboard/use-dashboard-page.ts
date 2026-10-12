import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../app/hooks.js';
import { authApi, useSwitchOrgMutation } from '../../features/auth/auth.api.js';
import { hydrateFromMe, setAccessToken } from '../../features/session/session.slice.js';
import {
  selectCan,
  selectSessionOrg,
  selectSessionOrgs,
  selectSessionUser,
} from '../../features/session/session.selectors.js';

export function useDashboardPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectSessionUser);
  const org = useAppSelector(selectSessionOrg);
  const orgs = useAppSelector(selectSessionOrgs);
  const canManageBranches = useAppSelector(selectCan('branches.manage'));
  const [switchOrg, { isLoading: switchingOrg }] = useSwitchOrgMutation();

  const onOrgChange = async (orgId: string) => {
    const result = await switchOrg({ orgId }).unwrap();
    dispatch(setAccessToken(result.accessToken));
    const me = await dispatch(authApi.endpoints.getMe.initiate(undefined)).unwrap();
    dispatch(hydrateFromMe(me));
  };

  return {
    t,
    user,
    org,
    orgs,
    canManageBranches,
    switchingOrg,
    onOrgChange,
  };
}
