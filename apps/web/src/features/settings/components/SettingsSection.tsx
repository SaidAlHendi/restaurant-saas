import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@app/ui';

export type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Titled card that groups related settings fields. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card className="gap-5 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-5">{children}</CardContent>
    </Card>
  );
}

export type SettingsToggleRowProps = {
  id: string;
  label: string;
  hint?: string;
  control: ReactNode;
};

/** Label + hint on one side, switch on the other, with a divider between rows. */
export function SettingsToggleRow({ id, label, hint, control }: SettingsToggleRowProps) {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
        </label>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
      {control}
    </div>
  );
}
