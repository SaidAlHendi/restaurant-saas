import { Button, Input, Label } from '@app/ui';

import type { PairDeviceViewModel } from '../hooks/use-pair-device.js';

export function PairDeviceView(props: PairDeviceViewModel) {
  const { code, onCodeChange, canSubmit, isLoading, errorMessage, onSubmit, onCancel, labels } =
    props;
  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-4 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          onSubmit();
        }
      }}
    >
      <div>
        <h2 className="text-xl font-semibold">{labels.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{labels.description}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pairing-code">{labels.codeLabel}</Label>
        <Input
          id="pairing-code"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={9}
          className="text-center font-mono text-xl tracking-widest"
          value={code}
          onChange={(event) => {
            onCodeChange(event.target.value);
          }}
        />
        {errorMessage ? (
          <p className="text-destructive text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit || isLoading}>
          {labels.submit}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {labels.cancel}
        </Button>
      </div>
    </form>
  );
}
