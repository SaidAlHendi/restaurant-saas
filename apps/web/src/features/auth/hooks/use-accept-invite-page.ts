import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { useAppDispatch } from '../../../app/hooks.js';
import { acceptInviteErrorMessage, isInviteExpiredError } from '../auth-invite-errors.utils.js';
import { authApi, useAcceptInviteMutation, usePreviewInviteQuery } from '../auth.api.js';
import { landingPathForPermissions } from '../../session/landing-path.js';
import { hydrateFromMe, setAccessToken } from '../../session/session.slice.js';

const acceptInviteFormSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  password: z.string().min(10).max(128),
});

type AcceptInviteFormValues = z.infer<typeof acceptInviteFormSchema>;

export function useAcceptInvitePage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const preview = usePreviewInviteQuery(token, { skip: token.length === 0 });
  const [acceptInvite, acceptState] = useAcceptInviteMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<AcceptInviteFormValues, unknown, AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteFormSchema),
    defaultValues: { name: '', password: '' },
  });

  const roleLabel = useMemo(() => {
    const key = preview.data?.roleKey;
    if (!key) {
      return '';
    }
    return t(`settings.staff.roles.${key}`);
  }, [preview.data?.roleKey, t]);

  const previewErrorMessage = preview.isError
    ? isInviteExpiredError(preview.error)
      ? t('auth.invite.expired')
      : t('auth.invite.error')
    : null;

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await acceptInvite({
        token,
        name: values.name,
        password: values.password,
      }).unwrap();
      dispatch(setAccessToken(result.accessToken));
      const me = await dispatch(authApi.endpoints.getMe.initiate(undefined)).unwrap();
      dispatch(hydrateFromMe(me));
      void navigate(landingPathForPermissions(me.permissions), { replace: true });
    } catch (err: unknown) {
      setSubmitError(acceptInviteErrorMessage(err, t));
    }
  });

  const errorMessage = submitError ?? previewErrorMessage;

  return {
    token,
    previewLoading: preview.isLoading,
    previewError: preview.isError,
    orgName: preview.data?.orgName ?? '',
    email: preview.data?.email ?? '',
    roleLabel,
    passwordRequired: preview.data?.passwordRequired ?? true,
    form,
    onSubmit,
    submitting: acceptState.isLoading,
    errorMessage,
    labels: {
      title: t('auth.invite.title'),
      description: t('auth.invite.description'),
      org: t('auth.invite.org'),
      email: t('auth.fields.email'),
      role: t('auth.invite.role'),
      name: t('auth.fields.name'),
      password: t('auth.fields.password'),
      submit: t('auth.invite.submit'),
      loading: t('common.loading'),
      expired: t('auth.invite.expired'),
    },
  };
}

export type AcceptInvitePageViewModel = ReturnType<typeof useAcceptInvitePage>;
