import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { loginBodySchema, type LoginBody } from '@app/shared';

import { useAppDispatch } from '../../app/hooks.js';
import { useLoginMutation, authApi } from '../../features/auth/auth.api.js';
import { landingPathForPermissions } from '../../features/session/landing-path.js';
import { hydrateFromMe, setAccessToken } from '../../features/session/session.slice.js';

import { authErrorMessage } from './auth-error-message.js';

export function useLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();

  const form = useForm<LoginBody>({
    resolver: zodResolver(loginBodySchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await login(values).unwrap();
    dispatch(setAccessToken(result.accessToken));
    const me = await dispatch(
      authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
    ).unwrap();
    dispatch(hydrateFromMe(me));
    void navigate(landingPathForPermissions(me.permissions), { replace: true });
  });

  const errorMessage = authErrorMessage(error, t);

  return { form, onSubmit, isLoading, errorMessage, t };
}
