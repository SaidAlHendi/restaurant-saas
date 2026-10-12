import { Button, Label, Spinner, Switch } from '@app/ui';

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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">{labels.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{labels.description}</p>
        {branchName.length > 0 ? (
          <p className="mt-2 text-sm font-medium">{branchName}</p>
        ) : null}
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
      <Button type="button" size="touch" disabled={saving} onClick={onSave}>
        {labels.save}
      </Button>
    </div>
  );
}
