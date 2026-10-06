import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { signupBodySchema, type SignupBody } from '@app/shared';

import { useAppDispatch } from '../../app/hooks.js';
import { authApi, useSignupMutation } from '../../features/auth/auth.api.js';
import { hydrateFromMe, setAccessToken } from '../../features/session/session.slice.js';

const defaultTimezone =
  typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Riyadh';

export function useSignupPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [signup, { isLoading, error }] = useSignupMutation();

  const form = useForm<SignupBody>({
    resolver: zodResolver(signupBodySchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      restaurantName: '',
      country: 'SA',
      timezone: defaultTimezone,
      currency: 'SAR',
      defaultLocale: i18n.language === 'ar' ? 'ar' : 'en',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await signup(values).unwrap();
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
