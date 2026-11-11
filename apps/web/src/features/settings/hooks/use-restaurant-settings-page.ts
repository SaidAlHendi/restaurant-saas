import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ORG_LOCALE_CODES, type OrgLocaleCode } from '@app/shared';
import { toast } from '@app/ui';

import { showApiError } from '../../../lib/show-api-error.js';
import { useCurrencySettingsForm } from './use-currency-settings-form.js';
import { useSettingsPageAccess } from './use-settings-page-access.js';
import { validateOrgLocalesForm } from '../org-locales-form.utils.js';
import {
  useDeleteOrgLogoMutation,
  useGetOrgSettingsQuery,
  usePatchOrgSettingsMutation,
  useUploadOrgLogoMutation,
} from '../settings.api.js';

const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function useRestaurantSettingsPage() {
  const { t } = useTranslation();
  const { allowed, redirectTo } = useSettingsPageAccess('org.manage');
  const { data, isLoading, isError } = useGetOrgSettingsQuery(undefined, { skip: !allowed });
  const [patchSettings, patchState] = usePatchOrgSettingsMutation();
  const [uploadLogo, uploadState] = useUploadOrgLogoMutation();
  const [deleteLogo, deleteState] = useDeleteOrgLogoMutation();

  const [name, setName] = useState('');
  const [locales, setLocales] = useState<OrgLocaleCode[]>(['en']);
  const [defaultLocale, setDefaultLocale] = useState<OrgLocaleCode>('en');
  const [localeErrorKey, setLocaleErrorKey] = useState<string | null>(null);
  const currencyForm = useCurrencySettingsForm(data);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setLocales(data.locales);
      setDefaultLocale(data.defaultLocale);
      setLocaleErrorKey(null);
    }
  }, [data]);

  const detailsDirty = useMemo(() => {
    if (!data) {
      return false;
    }
    if (name.trim() !== data.name) {
      return true;
    }
    if (locales.length !== data.locales.length) {
      return true;
    }
    for (const code of locales) {
      if (!data.locales.includes(code)) {
        return true;
      }
    }
    return defaultLocale !== data.defaultLocale;
  }, [data, defaultLocale, locales, name]);
  const dirty = detailsDirty || currencyForm.dirty;

  const onToggleLocale = useCallback(
    (code: OrgLocaleCode, checked: boolean) => {
      setLocales((prev) => {
        if (checked) {
          return prev.includes(code) ? prev : [...prev, code];
        }
        const next = prev.filter((c) => c !== code);
        if (next.length === 0) {
          return prev;
        }
        if (!next.includes(defaultLocale)) {
          setDefaultLocale(next[0] ?? 'en');
        }
        return next;
      });
      setLocaleErrorKey(null);
    },
    [defaultLocale],
  );

  const onSave = useCallback(async () => {
    if (!data) {
      return;
    }
    const validation = validateOrgLocalesForm({ locales, defaultLocale });
    if (!validation.ok) {
      setLocaleErrorKey(validation.messageKey);
      return;
    }
    setLocaleErrorKey(null);
    // Only sent when edited, so saving the name does not restamp the exchange rate.
    const currencyPatch = currencyForm.dirty ? currencyForm.validate() : {};
    if (currencyPatch === null) {
      return;
    }
    const result = await patchSettings({
      name: name.trim(),
      locales: validation.patch.locales,
      defaultLocale: validation.patch.defaultLocale,
      ...currencyPatch,
    });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    toast.success(t('settings.restaurant.saved'));
  }, [currencyForm, data, defaultLocale, locales, name, patchSettings, t]);

  const onLogoSelect = useCallback(
    (file: File) => {
      if (!ALLOWED_LOGO_TYPES.has(file.type)) {
        toast.error(t('settings.restaurant.logoTypeError'));
        return;
      }
      void uploadLogo(file).then((result) => {
        if ('error' in result) {
          showApiError(result.error, t);
        }
      });
    },
    [t, uploadLogo],
  );

  const onLogoRemove = useCallback(() => {
    void deleteLogo(undefined).then((result) => {
      if ('error' in result) {
        showApiError(result.error, t);
      }
    });
  }, [deleteLogo, t]);

  const localeOptions = ORG_LOCALE_CODES.map((code) => ({
    code,
    label: code === 'ar' ? t('settings.restaurant.localeAr') : t('settings.restaurant.localeEn'),
    checked: locales.includes(code),
  }));

  return {
    redirectTo,
    isLoading: allowed ? isLoading : false,
    isError,
    name,
    onNameChange: setName,
    slug: data?.slug ?? '',
    currencySection: currencyForm.view,
    logoUrl: data?.logoUrl ?? null,
    localeOptions,
    onToggleLocale,
    defaultLocale,
    onDefaultLocaleChange: (value: string) => {
      setDefaultLocale(value as OrgLocaleCode);
    },
    localeErrorKey: localeErrorKey ? t(localeErrorKey) : null,
    dirty,
    saving: patchState.isLoading,
    logoUploading: uploadState.isLoading,
    logoRemoving: deleteState.isLoading,
    onSave: () => {
      void onSave();
    },
    onLogoSelect,
    onLogoRemove,
    labels: {
      title: t('settings.restaurant.title'),
      description: t('settings.restaurant.description'),
      name: t('settings.restaurant.name'),
      slug: t('settings.restaurant.slug'),
      locales: t('settings.restaurant.locales'),
      defaultLocale: t('settings.restaurant.defaultLocale'),
      logo: t('settings.restaurant.logo'),
      logoChoose: t('settings.restaurant.logoChoose'),
      logoUploading: t('settings.restaurant.logoUploading'),
      logoRemove: t('settings.restaurant.logoRemove'),
      logoPreviewAlt: t('settings.restaurant.logoPreviewAlt'),
      save: t('settings.restaurant.save'),
      unsavedChanges: t('settings.unsavedChanges'),
      loadError: t('settings.restaurant.loadError'),
      loading: t('common.loading'),
    },
  };
}

export type RestaurantSettingsPageViewModel = ReturnType<typeof useRestaurantSettingsPage>;
