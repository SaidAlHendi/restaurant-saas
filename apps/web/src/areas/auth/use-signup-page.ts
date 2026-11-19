import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router-dom';

import { signupBodySchema, type SignupBody } from '@app/shared';

import { useAppDispatch } from '../../app/hooks.js';
import type { GuestOutletContext } from './GuestLayout.js';
import { authErrorMessage } from './auth-error-message.js';
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

  // The brand panel prints the restaurant name on a kitchen ticket while the owner types it.
  const { setLiveName } = useOutletContext<GuestOutletContext>();
  const restaurantName = form.watch('restaurantName');
  useEffect(() => {
    setLiveName(restaurantName);
  }, [restaurantName, setLiveName]);
  useEffect(
    () => () => {
      setLiveName('');
    },
    [setLiveName],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await signup(values).unwrap();
    dispatch(setAccessToken(result.accessToken));
    const me = await dispatch(
      authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
    ).unwrap();
    dispatch(hydrateFromMe(me));
    void navigate('/dashboard', { replace: true });
  });

  const errorMessage = authErrorMessage(error, t);

  return { form, onSubmit, isLoading, errorMessage, t };
}
