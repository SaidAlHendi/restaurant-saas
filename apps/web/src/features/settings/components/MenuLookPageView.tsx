import { Button, ImageUpload, Input, Label, SegmentedControl, Spinner, Switch } from '@app/ui';

import type { MenuLookPageViewModel } from '../hooks/use-menu-look-page.js';
import { HERO_TEXT_MAX } from '../menu-look-form.utils.js';
import { MenuLookPreview } from './MenuLookPreview.js';
import { SettingsSection, SettingsToggleRow, UnsavedChangesAlert } from './SettingsSection.js';

export function MenuLookPageView(props: MenuLookPageViewModel) {
  const {
    isLoading,
    isError,
    form,
    update,
    onPresetChange,
    onLayoutChange,
    presetOptions,
    layoutOptions,
    dirty,
    saving,
    errorMessage,
    onSave,
    coverUrl,
    coverUploading,
    coverRemoving,
    onCoverSelect,
    onCoverRemove,
    locked,
    lock,
    brand,
    preview,
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
      {locked ? (
        <div
          role="note"
          className="border-border bg-muted flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 xl:col-span-2"
        >
          <p className="text-sm">{lock.message}</p>
          <div className="flex flex-wrap gap-2">
            {coverUrl ? (
              <Button
                type="button"
                size="touch"
                variant="ghost"
                disabled={coverRemoving}
                onClick={onCoverRemove}
              >
                {labels.coverRemove}
              </Button>
            ) : null}
            <Button type="button" size="touch" variant="outline" onClick={lock.onUpgrade}>
              {lock.upgradeLabel}
            </Button>
          </div>
        </div>
      ) : null}
      <fieldset disabled={locked} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 disabled:opacity-60">
        <SettingsSection title={labels.title} description={labels.description}>
          <div className="space-y-2">
            <Label>{labels.preset}</Label>
            <SegmentedControl
              label={labels.preset}
              options={presetOptions}
              value={form.preset}
              onValueChange={onPresetChange}
            />
          </div>
          <div className="space-y-2">
            <Label>{labels.layout}</Label>
            <SegmentedControl
              label={labels.layout}
              options={layoutOptions}
              value={form.layout}
              onValueChange={onLayoutChange}
            />
          </div>
          <SettingsToggleRow
            id="menu-look-search"
            label={labels.showSearch}
            hint={labels.showSearchHint}
            control={
              <Switch
                id="menu-look-search"
                checked={form.showSearch}
                onCheckedChange={(showSearch) => {
                  update({ showSearch });
                }}
              />
            }
          />
          <div className="space-y-2">
            <Label htmlFor="menu-look-brand-hex">{labels.brandColor}</Label>
            <p className="text-muted-foreground text-xs">{labels.brandColorHint}</p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label={labels.brandColor}
                value={brand.picker}
                className="h-11 w-14 cursor-pointer rounded-md border"
                onChange={(e) => {
                  update({ brandColor: e.target.value });
                }}
              />
              <Input
                id="menu-look-brand-hex"
                value={form.brandColor}
                dir="ltr"
                maxLength={7}
                placeholder="#1f4a37"
                className="w-32"
                onChange={(e) => {
                  update({ brandColor: withHash(e.target.value) });
                }}
              />
              {form.brandColor !== '' ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    update({ brandColor: '' });
                  }}
                >
                  {labels.brandColorClear}
                </Button>
              ) : null}
            </div>
            {brand.color ? (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="inline-flex size-7 items-center justify-center rounded-full border text-xs font-bold"
                  style={{ backgroundColor: brand.color, color: brand.foreground ?? undefined }}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span dir="ltr">{brand.color}</span>
                {brand.adjusted ? (
                  <span className="text-muted-foreground">{labels.brandColorAdjusted}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <SettingsToggleRow
            id="menu-look-ticker"
            label={labels.showTicker}
            hint={labels.showTickerHint}
            control={
              <Switch
                id="menu-look-ticker"
                checked={form.showTicker}
                onCheckedChange={(showTicker) => {
                  update({ showTicker });
                }}
              />
            }
          />
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">{labels.closingHint}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <HeroField
                id="menu-look-closing-en"
                label={labels.closingEn}
                value={form.closingEn}
                onChange={(closingEn) => {
                  update({ closingEn });
                }}
              />
              <HeroField
                id="menu-look-closing-ar"
                label={labels.closingAr}
                value={form.closingAr}
                dir="rtl"
                onChange={(closingAr) => {
                  update({ closingAr });
                }}
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title={labels.heroSection}>
          <SettingsToggleRow
            id="menu-look-hero"
            label={labels.heroEnabled}
            hint={labels.heroEnabledHint}
            control={
              <Switch
                id="menu-look-hero"
                checked={form.heroEnabled}
                onCheckedChange={(heroEnabled) => {
                  update({ heroEnabled });
                }}
              />
            }
          />
          {form.heroEnabled ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <HeroField
                id="menu-look-headline-en"
                label={labels.headlineEn}
                value={form.headlineEn}
                onChange={(headlineEn) => {
                  update({ headlineEn });
                }}
              />
              <HeroField
                id="menu-look-headline-ar"
                label={labels.headlineAr}
                value={form.headlineAr}
                dir="rtl"
                onChange={(headlineAr) => {
                  update({ headlineAr });
                }}
              />
              <HeroField
                id="menu-look-subline-en"
                label={labels.sublineEn}
                value={form.sublineEn}
                onChange={(sublineEn) => {
                  update({ sublineEn });
                }}
              />
              <HeroField
                id="menu-look-subline-ar"
                label={labels.sublineAr}
                value={form.sublineAr}
                dir="rtl"
                onChange={(sublineAr) => {
                  update({ sublineAr });
                }}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{labels.cover}</Label>
            <p className="text-muted-foreground text-xs">{labels.coverHint}</p>
            <ImageUpload
              previewUrl={coverUrl}
              disabled={coverUploading || coverRemoving}
              isUploading={coverUploading}
              accept="image/jpeg,image/png,image/webp"
              onFileSelect={onCoverSelect}
              onRemove={coverUrl && !locked ? onCoverRemove : undefined}
              label={labels.cover}
              chooseLabel={labels.coverChoose}
              uploadingLabel={labels.coverUploading}
              removeLabel={labels.coverRemove}
              previewAlt={labels.coverPreviewAlt}
            />
            {coverUrl && !form.heroEnabled ? (
              <p className="text-muted-foreground text-xs">{labels.coverNeedsHero}</p>
            ) : null}
          </div>
          {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
        </SettingsSection>
        <p className="text-muted-foreground text-xs">{labels.scopeNote}</p>
      </fieldset>

      <div className="xl:sticky xl:top-0 xl:max-h-[calc(100dvh-12rem)] xl:overflow-y-auto xl:rounded-xl">
        <SettingsSection title={labels.previewTitle}>
          <SegmentedControl
            label={labels.previewLanguage}
            options={preview.localeOptions}
            value={preview.locale}
            onValueChange={preview.onLocaleChange}
            className="w-full sm:w-48"
          />
          <div className="mx-auto w-full max-w-sm">
            <MenuLookPreview
              theme={preview.theme}
              locale={preview.locale}
              restaurantName={preview.restaurantName}
              coverUrl={preview.coverUrl}
              categories={preview.categories}
              dishes={preview.dishes}
              searchPlaceholder={labels.searchPlaceholder}
              label={labels.previewLabel}
            />
          </div>
        </SettingsSection>
      </div>

      <div className="flex justify-end xl:col-span-2">
        <Button type="button" size="touch" disabled={!dirty || saving} onClick={onSave}>
          {labels.save}
        </Button>
      </div>
    </div>
  );
}

type HeroFieldProps = {
  id: string;
  label: string;
  value: string;
  dir?: 'rtl';
  onChange: (value: string) => void;
};

function HeroField({ id, label, value, dir, onChange }: HeroFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        dir={dir}
        maxLength={HERO_TEXT_MAX}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

/** Owners often paste `1f4a37`; add the missing `#` so the value is a valid colour. */
function withHash(value: string): string {
  const v = value.trim();
  return v !== '' && !v.startsWith('#') ? `#${v}` : v;
}
