import {
  Alert,
  AlertDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/ui';

import type { CurrencySettingsSectionViewModel } from '../hooks/use-currency-settings-form.js';

import { SettingsSection } from './SettingsSection.js';

type StepSelectProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

function StepSelect({ id, label, hint, value, options, onChange }: StepSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}

/** Currency section of the restaurant settings: base currency, display currency, rate, rounding. */
export function CurrencySettingsSectionView(props: CurrencySettingsSectionViewModel) {
  const { labels } = props;

  return (
    <SettingsSection title={labels.title} description={labels.description}>
      <div className="bg-muted/50 space-y-1 rounded-md p-3">
        <Label>{labels.baseCurrency}</Label>
        <p className="text-sm font-medium">{props.baseCurrency}</p>
        <p className="text-muted-foreground text-xs">{labels.baseCurrencyHint}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="display-currency">{labels.displayCurrency}</Label>
        <Select value={props.displayCurrency} onValueChange={props.onDisplayCurrencyChange}>
          <SelectTrigger id="display-currency" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {props.currencyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">{labels.displayCurrencyHint}</p>
      </div>
      {props.converting ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="exchange-rate">{labels.rate}</Label>
            <Input
              id="exchange-rate"
              className="w-full sm:w-64"
              inputMode="decimal"
              dir="ltr"
              value={props.rateText}
              aria-invalid={props.rateError !== null}
              onChange={(e) => {
                props.onRateChange(e.target.value);
              }}
            />
            {props.rateError ? (
              <p className="text-destructive text-sm">{props.rateError}</p>
            ) : (
              <p className="text-muted-foreground text-xs">{labels.rateHint}</p>
            )}
            {props.rateUpdatedLabel ? (
              <p className="text-muted-foreground text-xs">{props.rateUpdatedLabel}</p>
            ) : null}
          </div>
          {props.rateStaleWarning ? (
            <Alert variant="warning" role="status">
              <AlertDescription className="text-foreground">{props.rateStaleWarning}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <StepSelect
              id="display-item-step"
              label={labels.itemStep}
              hint={labels.itemStepHint}
              value={props.itemStep}
              options={props.stepOptions}
              onChange={props.onItemStepChange}
            />
            <StepSelect
              id="display-total-step"
              label={labels.totalStep}
              hint={labels.totalStepHint}
              value={props.totalStep}
              options={props.stepOptions}
              onChange={props.onTotalStepChange}
            />
          </div>
          {props.preview ? (
            <p className="bg-muted/50 rounded-md p-3 text-sm">{props.preview}</p>
          ) : null}
        </>
      ) : null}
    </SettingsSection>
  );
}
