import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { adminLoginBodySchema, type AdminLoginBody } from '@app/shared';

import { useAppDispatch } from '../../app/hooks.js';
import { setAccessToken, setAdmin } from '../session/session.slice.js';
import { useLoginMutation } from './auth.api.js';

export function useLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading, isError }] = useLoginMutation();

  const form = useForm<AdminLoginBody>({
    resolver: zodResolver(adminLoginBodySchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await login(values).unwrap();
      dispatch(setAccessToken(result.accessToken));
      dispatch(setAdmin(result.admin));
      void navigate('/dashboard', { replace: true });
    } catch {
      // Shown through isError. The API answers every failure the same way (no enumeration).
    }
  });

  return {
    form,
    onSubmit,
    isLoading,
    // One generic message on purpose: never say whether the email or the password was wrong.
    errorMessage: isError ? t('auth.errors.invalidCredentials') : null,
    t,
  };
}
