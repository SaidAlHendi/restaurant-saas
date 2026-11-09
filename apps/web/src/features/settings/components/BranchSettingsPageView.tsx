import { ArrowLeftIcon, ChevronDownIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
  Textarea,
} from '@app/ui';

import { DayStartPicker } from './DayStartPicker.js';
import { SettingsSection, SettingsToggleRow, UnsavedChangesAlert } from './SettingsSection.js';
import type { BranchSettingsPageViewModel } from '../hooks/use-branch-settings-page.js';

export function BranchSettingsPageView(props: BranchSettingsPageViewModel) {
  const {
    isLoading,
    isError,
    notFound,
    name,
    onNameChange,
    isActive,
    onIsActiveChange,
    payBeforeSend,
    onPayBeforeSendChange,
    acceptsCard,
    onAcceptsCardChange,
    taxInclusive,
    onTaxInclusiveChange,
    dayStartHour,
    uiLocale,
    dayStartGroups,
    onDayStartHourChange,
    timezone,
    onTimezoneChange,
    timezoneQuery,
    onTimezoneQueryChange,
    timezoneOptions,
    taxPercent,
    onTaxPercentChange,
    taxError,
    address,
    onAddressChange,
    receiptHeader,
    onReceiptHeaderChange,
    receiptFooter,
    onReceiptFooterChange,
    receiptPreviewHtml,
    dirty,
    saving,
    onSave,
    labels,
  } = props;

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive p-6">{labels.loadError}</p>;
  }

  if (notFound) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <p className="text-muted-foreground">{labels.notFound}</p>
        <Link to="/dashboard/branches" className="text-primary text-sm font-medium underline">
          {labels.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid w-full items-start gap-5 xl:grid-cols-2">
      {dirty ? <UnsavedChangesAlert message={labels.unsavedChanges} /> : null}
      <Link
        to="/dashboard/branches"
        className="text-muted-foreground hover:text-foreground inline-flex xl:col-span-2 w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
        {labels.back}
      </Link>
      <SettingsSection title={labels.generalSection} description={labels.description}>
        <div className="space-y-2">
          <Label htmlFor="branch-name">{labels.nameLabel}</Label>
          <Input
            id="branch-name"
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch-address">{labels.address}</Label>
          <Textarea
            id="branch-address"
            value={address}
            rows={2}
            onChange={(e) => {
              onAddressChange(e.target.value);
            }}
          />
        </div>
        <SettingsToggleRow
          id="branch-active"
          label={labels.activeLabel}
          hint={labels.activeHint}
          control={
            <Switch id="branch-active" checked={isActive} onCheckedChange={onIsActiveChange} />
          }
        />
      </SettingsSection>
      <SettingsSection title={labels.taxSection} description={labels.taxSectionHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tax-percent">{labels.taxPercent}</Label>
            <Input
              id="tax-percent"
              inputMode="decimal"
              value={taxPercent}
              onChange={(e) => {
                onTaxPercentChange(e.target.value);
              }}
            />
            <p className="text-muted-foreground text-xs">{labels.taxPercentHint}</p>
            {taxError ? <p className="text-destructive text-xs">{taxError}</p> : null}
          </div>
          <div className="flex items-center justify-between gap-4 pt-6">
            <div className="space-y-1">
              <Label htmlFor="tax-inclusive">{labels.taxInclusive}</Label>
              <p className="text-muted-foreground text-xs">{labels.taxInclusiveHint}</p>
            </div>
            <Switch
              id="tax-inclusive"
              checked={taxInclusive}
              onCheckedChange={onTaxInclusiveChange}
            />
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title={labels.paymentsSection} description={labels.paymentsSectionHint}>
        <SettingsToggleRow
          id="pay-before-send"
          label={labels.payBeforeSend}
          hint={labels.payBeforeSendHint}
          control={
            <Switch
              id="pay-before-send"
              checked={payBeforeSend}
              onCheckedChange={onPayBeforeSendChange}
            />
          }
        />
        <SettingsToggleRow
          id="accepts-card"
          label={labels.acceptsCard}
          hint={labels.acceptsCardHint}
          control={
            <Switch id="accepts-card" checked={acceptsCard} onCheckedChange={onAcceptsCardChange} />
          }
        />
      </SettingsSection>
      <details className="group xl:col-span-2 rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span className="space-y-1">
            <span className="block text-base font-semibold">{labels.advancedTitle}</span>
            <span className="text-muted-foreground block text-sm">{labels.advancedHint}</span>
          </span>
          <ChevronDownIcon
            className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-5 border-t p-5">
          <SettingsSection title={labels.businessDaySection}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="day-start">{labels.dayStartHour}</Label>
                <DayStartPicker
                  id="day-start"
                  value={dayStartHour}
                  onChange={onDayStartHourChange}
                  locale={uiLocale}
                  groups={dayStartGroups}
                />
                <p className="text-muted-foreground text-xs">{labels.dayStartHourHint}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone-search">{labels.timezone}</Label>
                <Input
                  id="timezone-search"
                  value={timezoneQuery}
                  placeholder={timezone}
                  onChange={(e) => {
                    onTimezoneQueryChange(e.target.value);
                  }}
                />
                <Select value={timezone} onValueChange={onTimezoneChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingsSection>
          <SettingsSection title={labels.receiptSection} description={labels.receiptSectionHint}>
            <div className="space-y-2">
              <Label htmlFor="receipt-header">{labels.receiptHeader}</Label>
              <Textarea
                id="receipt-header"
                value={receiptHeader}
                rows={2}
                onChange={(e) => {
                  onReceiptHeaderChange(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-footer">{labels.receiptFooter}</Label>
              <Textarea
                id="receipt-footer"
                value={receiptFooter}
                rows={2}
                onChange={(e) => {
                  onReceiptFooterChange(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{labels.receiptPreview}</Label>
              <iframe
                title={labels.receiptPreview}
                className="bg-background h-64 w-full rounded-md border"
                sandbox=""
                srcDoc={receiptPreviewHtml}
              />
            </div>
          </SettingsSection>
        </div>
      </details>
      <div className="flex justify-end xl:col-span-2">
        <Button type="button" size="touch" disabled={!dirty || saving} onClick={onSave}>
          {labels.save}
        </Button>
      </div>
    </div>
  );
}
