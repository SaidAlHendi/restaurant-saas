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

import type { RestaurantSettingsPageViewModel } from '../hooks/use-restaurant-settings-page.js';

export function RestaurantSettingsPageView(props: RestaurantSettingsPageViewModel) {
  const {
    isLoading,
    isError,
    name,
    onNameChange,
    slug,
    currency,
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">{labels.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{labels.description}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-name">{labels.name}</Label>
        <Input id="org-name" value={name} onChange={(e) => { onNameChange(e.target.value); }} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{labels.slug}</Label>
          <p className="text-muted-foreground text-sm">{slug}</p>
        </div>
        <div className="space-y-1">
          <Label>{labels.currency}</Label>
          <p className="text-muted-foreground text-sm">{currency}</p>
        </div>
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
      <div className="space-y-3">
        <Label>{labels.locales}</Label>
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
      <Button type="button" size="touch" disabled={!dirty || saving} onClick={onSave}>
        {labels.save}
      </Button>
    </div>
  );
}
