import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { authApi, useSwitchOrgMutation } from '../../auth/auth.api.js';
import { hydrateFromMe, setAccessToken } from '../../session/session.slice.js';
import {
  selectSessionOrg,
  selectSessionOrgs,
} from '../../session/session.selectors.js';

export function useOrgSwitcher() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const org = useAppSelector(selectSessionOrg);
  const orgs = useAppSelector(selectSessionOrgs);
  const [switchOrg, { isLoading: switchingOrg }] = useSwitchOrgMutation();

  const showOrgSwitcher = orgs.length > 1;

  const onOrgChange = async (orgId: string) => {
    const result = await switchOrg({ orgId }).unwrap();
    dispatch(setAccessToken(result.accessToken));
    const me = await dispatch(authApi.endpoints.getMe.initiate(undefined)).unwrap();
    dispatch(hydrateFromMe(me));
  };

  return {
    org,
    orgs,
    showOrgSwitcher,
    switchingOrg,
    onOrgChange: (orgId: string) => {
      void onOrgChange(orgId);
    },
    labels: {
      org: t('dashboard.org'),
      selectOrg: t('dashboard.selectOrg'),
    },
  };
}

export type OrgSwitcherViewModel = ReturnType<typeof useOrgSwitcher>;
