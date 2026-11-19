import {
  Button,
  ImageUpload,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
} from '@app/ui';

import { CurrencySettingsSectionView } from './CurrencySettingsSectionView.js';
import { SettingsSection, UnsavedChangesAlert } from './SettingsSection.js';
import type { RestaurantSettingsPageViewModel } from '../hooks/use-restaurant-settings-page.js';

export function RestaurantSettingsPageView(props: RestaurantSettingsPageViewModel) {
  const {
    isLoading,
    isError,
    name,
    onNameChange,
    slug,
    currencySection,
    logoUrl,
    localeOptions,
    onToggleLocale,
    defaultLocale,
    onDefaultLocaleChange,
    localeErrorKey,
    dirty,
    saving,
    logoUploading,
    logoRemoving,
    onSave,
    onLogoSelect,
    onLogoRemove,
    labels,
  } = props;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive">{labels.loadError}</p>;
  }

  return (
    <div className="grid w-full items-start gap-5 xl:grid-cols-2">
      {dirty ? <UnsavedChangesAlert message={labels.unsavedChanges} /> : null}
      <SettingsSection title={labels.title} description={labels.description}>
        <div className="space-y-2">
          <Label htmlFor="org-name">{labels.name}</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
            }}
          />
        </div>
        <div className="bg-muted/50 space-y-1 rounded-md p-3">
          <Label>{labels.slug}</Label>
          <p className="text-muted-foreground text-sm">{slug}</p>
        </div>
        <div className="space-y-2">
          <Label>{labels.logo}</Label>
          <ImageUpload
            previewUrl={logoUrl}
            disabled={logoUploading || logoRemoving}
            isUploading={logoUploading}
            accept="image/jpeg,image/png,image/webp"
            onFileSelect={onLogoSelect}
            onRemove={logoUrl ? onLogoRemove : undefined}
            label={labels.logo}
            chooseLabel={labels.logoChoose}
            uploadingLabel={labels.logoUploading}
            removeLabel={labels.logoRemove}
            previewAlt={labels.logoPreviewAlt}
          />
        </div>
      </SettingsSection>
      <SettingsSection title={labels.locales}>
        <div className="flex flex-col gap-3">
          {localeOptions.map((opt) => (
            <div key={opt.code} className="flex items-center justify-between gap-4">
              <span className="text-sm">{opt.label}</span>
              <Switch
                checked={opt.checked}
                onCheckedChange={(checked) => {
                  onToggleLocale(opt.code, checked);
                }}
              />
            </div>
          ))}
          {localeErrorKey ? <p className="text-destructive text-sm">{localeErrorKey}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>{labels.defaultLocale}</Label>
          <Select
            value={defaultLocale}
            onValueChange={(value) => {
              onDefaultLocaleChange(value);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {localeOptions
                .filter((o) => o.checked)
                .map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {o.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>
      <CurrencySettingsSectionView {...currencySection} />
      <div className="flex justify-end xl:col-span-2">
        <Button type="button" size="touch" disabled={!dirty || saving} onClick={onSave}>
          {labels.save}
        </Button>
      </div>
    </div>
  );
}
