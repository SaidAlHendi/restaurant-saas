'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError, authApi } from '@/lib/api-client';

function errorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'auth.errors.throttled';
    if (error.status === 401) return 'auth.errors.invalid';
  }
  return 'auth.errors.unreachable';
}

export function useLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      router.replace('/');
      router.refresh();
    },
  });

  const onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    login.mutate({ email: email.trim(), password });
  };

  return {
    t,
    email,
    password,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSubmit,
    isLoading: login.isPending || login.isSuccess,
    errorMessage: login.isError ? t(errorKey(login.error)) : null,
  };
}
