import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { loginBodySchema, type LoginBody } from '@app/shared';

import { useAppDispatch } from '../../app/hooks.js';
import { useLoginMutation, authApi } from '../../features/auth/auth.api.js';
import { hydrateFromMe, setAccessToken } from '../../features/session/session.slice.js';

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
    const me = await dispatch(authApi.endpoints.getMe.initiate(undefined)).unwrap();
    dispatch(hydrateFromMe(me));
    void navigate('/dashboard', { replace: true });
  });

  const errorMessage =
    error && 'data' in error && error.data && typeof error.data === 'object' && 'error' in error.data
      ? ((error.data as { error?: { message?: string } }).error?.message ?? t('auth.errors.generic'))
      : error
        ? t('auth.errors.generic')
        : null;

  return { form, onSubmit, isLoading, errorMessage, t };
}
