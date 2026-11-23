import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DEFAULT_MENU_THEME,
  BRAND_COLOR_PATTERN,
  resolveThemeBrand,
  menuThemeLayoutSchema,
  menuThemePresetSchema,
  type MenuThemeLayout,
  type MenuThemePreset,
} from '@app/shared';
import { toast } from '@app/ui';

import { useNavigate } from 'react-router-dom';

import { cheapestPlanWithFeature } from '../../billing/billing.utils.js';

import { showApiError } from '../../../lib/show-api-error.js';
import {
  isMenuLookDirty,
  menuLookErrorKey,
  menuLookFormFromTheme,
  menuThemeFromForm,
  type MenuLookForm,
} from '../menu-look-form.utils.js';
import {
  useDeleteOrgMenuCoverMutation,
  useGetOrgSettingsQuery,
  usePatchOrgSettingsMutation,
  useUploadOrgMenuCoverMutation,
} from '../settings.api.js';
import { useSettingsPageAccess } from './use-settings-page-access.js';

const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function useMenuLookPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { allowed, redirectTo } = useSettingsPageAccess('org.manage');
  const { data, isLoading, isError } = useGetOrgSettingsQuery(undefined, { skip: !allowed });
  const [patchSettings, patchState] = usePatchOrgSettingsMutation();
  const [uploadCover, uploadState] = useUploadOrgMenuCoverMutation();
  const [deleteCover, deleteState] = useDeleteOrgMenuCoverMutation();

  const savedTheme = data?.menuTheme ?? DEFAULT_MENU_THEME;
  const [form, setForm] = useState<MenuLookForm>(() => menuLookFormFromTheme(DEFAULT_MENU_THEME));
  const [previewLocale, setPreviewLocale] = useState<'ar' | 'en'>('en');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Reseed only when the saved theme changes by value. A refetch (focus, reconnect, another
  // settings save) returns a new object with the same theme and must not wipe unsaved edits.
  const savedThemeKey = data ? JSON.stringify(data.menuTheme) : null;
  useEffect(() => {
    if (data) {
      setForm(menuLookFormFromTheme(data.menuTheme));
      setErrorKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the saved theme's value
  }, [savedThemeKey]);

  const dirty = data ? isMenuLookDirty(form, savedTheme) : false;
  // Without the plan only the default look exists: the form is read-only and the preview shows that look.
  const locked = data ? !data.menuLookAllowed : false;
  const formTheme = useMemo(() => menuThemeFromForm(form), [form]);
  const previewTheme = locked ? DEFAULT_MENU_THEME : formTheme;
  const brand = resolveThemeBrand(formTheme);
  const unlockPlanKey = cheapestPlanWithFeature('menu.branding');

  const update = useCallback((patch: Partial<MenuLookForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrorKey(null);
  }, []);

  const onSave = useCallback(async () => {
    const error = menuLookErrorKey(form);
    if (error) {
      setErrorKey(error);
      return;
    }
    const result = await patchSettings({ menuTheme: menuThemeFromForm(form) });
    if ('error' in result) {
      showApiError(result.error, t);
      return;
    }
    toast.success(t('settings.menuLook.saved'));
  }, [form, patchSettings, t]);

  const onCoverSelect = useCallback(
    (file: File) => {
      if (!ALLOWED_COVER_TYPES.has(file.type)) {
        toast.error(t('settings.menuLook.coverTypeError'));
        return;
      }
      void uploadCover(file).then((result) => {
        if ('error' in result) {
          showApiError(result.error, t);
        }
      });
    },
    [t, uploadCover],
  );

  const onCoverRemove = useCallback(() => {
    void deleteCover(undefined).then((result) => {
      if ('error' in result) {
        showApiError(result.error, t);
      }
    });
  }, [deleteCover, t]);

  const presetOptions = menuThemePresetSchema.options.map((value) => ({
    value,
    label: t(`settings.menuLook.presets.${value}`),
  }));
  const layoutOptions = menuThemeLayoutSchema.options.map((value) => ({
    value,
    label: t(`settings.menuLook.layouts.${value}`),
  }));

  return {
    redirectTo,
    isLoading: allowed ? isLoading : false,
    isError,
    form,
    update,
    onPresetChange: (preset: MenuThemePreset) => {
      update({ preset });
    },
    onLayoutChange: (layout: MenuThemeLayout) => {
      update({ layout });
    },
    presetOptions,
    layoutOptions,
    coverUrl: data?.menuCoverUrls?.url960 ?? null,
    coverUploading: uploadState.isLoading,
    coverRemoving: deleteState.isLoading,
    onCoverSelect,
    onCoverRemove,
    locked,
    lock: {
      message: t('settings.menuLook.lockedMessage', {
        plan: unlockPlanKey === null ? '' : t(`billing.plans.${unlockPlanKey}`),
      }),
      upgradeLabel: t('billing.upgrade.seePlans'),
      onUpgrade: () => {
        void navigate('/dashboard/billing');
      },
    },
    brand: {
      color: brand?.color ?? null,
      foreground: brand?.foreground ?? null,
      adjusted: brand?.adjusted ?? false,
      picker: BRAND_COLOR_PATTERN.test(form.brandColor) ? form.brandColor : '#1f4a37',
    },
    dirty: dirty && !locked,
    saving: patchState.isLoading,
    errorMessage: errorKey ? t(errorKey) : null,
    onSave: () => {
      void onSave();
    },
    preview: {
      theme: previewTheme,
      restaurantName: data?.name ?? '',
      // Guests get no cover on a plan without the feature, so the preview must not show one.
      coverUrl: locked ? null : (data?.menuCoverUrls?.url480 ?? null),
      locale: previewLocale,
      onLocaleChange: setPreviewLocale,
      localeOptions: [
        { value: 'en' as const, label: t('settings.restaurant.localeEn') },
        { value: 'ar' as const, label: t('settings.restaurant.localeAr') },
      ],
      categories: [
        t('settings.menuLook.sample.category1'),
        t('settings.menuLook.sample.category2'),
        t('settings.menuLook.sample.category3'),
      ],
      dishes: [1, 2, 3, 4].map((n) => ({
        id: String(n),
        name: t(`settings.menuLook.sample.dish${String(n)}`),
        description: t('settings.menuLook.sample.description'),
        price: `${String(n * 12)}.00`,
      })),
    },
    labels: {
      title: t('settings.menuLook.title'),
      description: t('settings.menuLook.description'),
      preset: t('settings.menuLook.preset'),
      layout: t('settings.menuLook.layout'),
      heroSection: t('settings.menuLook.heroSection'),
      heroEnabled: t('settings.menuLook.heroEnabled'),
      heroEnabledHint: t('settings.menuLook.heroEnabledHint'),
      headlineEn: t('settings.menuLook.headlineEn'),
      headlineAr: t('settings.menuLook.headlineAr'),
      sublineEn: t('settings.menuLook.sublineEn'),
      sublineAr: t('settings.menuLook.sublineAr'),
      showSearch: t('settings.menuLook.showSearch'),
      showSearchHint: t('settings.menuLook.showSearchHint'),
      brandColor: t('settings.menuLook.brandColor'),
      brandColorHint: t('settings.menuLook.brandColorHint'),
      brandColorClear: t('settings.menuLook.brandColorClear'),
      brandColorAdjusted: t('settings.menuLook.brandColorAdjusted'),
      cover: t('settings.menuLook.cover'),
      coverHint: t('settings.menuLook.coverHint'),
      coverChoose: t('settings.menuLook.coverChoose'),
      coverUploading: t('settings.menuLook.coverUploading'),
      coverRemove: t('settings.menuLook.coverRemove'),
      coverPreviewAlt: t('settings.menuLook.coverPreviewAlt'),
      coverNeedsHero: t('settings.menuLook.coverNeedsHero'),
      showTicker: t('settings.menuLook.showTicker'),
      showTickerHint: t('settings.menuLook.showTickerHint'),
      closingEn: t('settings.menuLook.closingEn'),
      closingAr: t('settings.menuLook.closingAr'),
      closingHint: t('settings.menuLook.closingHint'),
      previewTitle: t('settings.menuLook.previewTitle'),
      previewLabel: t('settings.menuLook.previewLabel'),
      previewLanguage: t('settings.menuLook.previewLanguage'),
      searchPlaceholder: t('settings.menuLook.searchPlaceholder'),
      scopeNote: t('settings.menuLook.scopeNote'),
      save: t('settings.restaurant.save'),
      unsavedChanges: t('settings.unsavedChanges'),
      loadError: t('settings.menuLook.loadError'),
      loading: t('common.loading'),
    },
  };
}

export type MenuLookPageViewModel = ReturnType<typeof useMenuLookPage>;
