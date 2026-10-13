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

import type { BranchSettingsPageViewModel } from '../hooks/use-branch-settings-page.js';

export function BranchSettingsPageView(props: BranchSettingsPageViewModel) {
  const {
    isLoading,
    isError,
    branchName,
    payBeforeSend,
    onPayBeforeSendChange,
    acceptsCard,
    onAcceptsCardChange,
    taxInclusive,
    onTaxInclusiveChange,
    dayStartHour,
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">{labels.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{labels.description}</p>
        {branchName.length > 0 ? (
          <p className="mt-2 text-sm font-medium">{branchName}</p>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">{labels.taxDayNote}</p>
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
          <Switch id="tax-inclusive" checked={taxInclusive} onCheckedChange={onTaxInclusiveChange} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="day-start">{labels.dayStartHour}</Label>
          <Input
            id="day-start"
            inputMode="numeric"
            value={dayStartHour}
            onChange={(e) => {
              onDayStartHourChange(e.target.value);
            }}
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
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="pay-before-send">{labels.payBeforeSend}</Label>
          <p className="text-muted-foreground text-sm">{labels.payBeforeSendHint}</p>
        </div>
        <Switch
          id="pay-before-send"
          checked={payBeforeSend}
          onCheckedChange={onPayBeforeSendChange}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="accepts-card">{labels.acceptsCard}</Label>
          <p className="text-muted-foreground text-sm">{labels.acceptsCardHint}</p>
        </div>
        <Switch id="accepts-card" checked={acceptsCard} onCheckedChange={onAcceptsCardChange} />
      </div>
      <Button type="button" size="touch" disabled={!dirty || saving} onClick={onSave}>
        {labels.save}
      </Button>
    </div>
  );
}
