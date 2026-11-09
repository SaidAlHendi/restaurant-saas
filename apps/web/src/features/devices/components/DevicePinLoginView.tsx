import { Button, Spinner } from '@app/ui';

import { PosPinPadView } from '../../pos/components/PosPinPadView.js';
import type { DevicePinLoginViewModel } from '../hooks/use-device-pin-login.js';

export function DevicePinLoginView(props: DevicePinLoginViewModel) {
  const { loading, loadFailed, deviceLabel, users, pinPad, errorMessage, lockCountdown, labels } =
    props;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold">{labels.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{deviceLabel}</p>
        <p className="text-muted-foreground mt-1 text-sm">{labels.subtitle}</p>
      </header>
      {loadFailed ? <p className="text-destructive text-sm">{labels.loadError}</p> : null}
      <div className="w-full space-y-3">
        <p className="text-muted-foreground text-sm font-medium">{labels.pickUser}</p>
        {users.length === 0 && !loadFailed ? (
          <p className="text-muted-foreground text-sm">{labels.emptyUsers}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {users.map((user) => (
              <li key={user.membershipId}>
                <button
                  type="button"
                  className={`border-border hover:bg-accent w-full rounded-lg border p-3 text-start transition ${user.selected ? 'border-primary bg-accent ring-primary ring-2' : ''}`}
                  onClick={user.onSelect}
                >
                  <span className="block font-medium">{user.name}</span>
                  <span className="text-muted-foreground text-xs">{user.roleLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {lockCountdown !== null ? (
        <p className="text-destructive text-sm">
          {labels.locked} {lockCountdown}
        </p>
      ) : null}
      {errorMessage !== null && lockCountdown === null ? (
        <p className="text-destructive text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <PosPinPadView
        digits={pinPad.digits}
        pinDigitsLabel={pinPad.pinDigitsLabel}
        canSubmit={pinPad.canSubmit}
        submitting={pinPad.submitting}
        onDigit={pinPad.onDigit}
        onBackspace={pinPad.onBackspace}
        onSubmit={pinPad.onSubmit}
        labels={{ backspace: labels.backspace, submit: labels.submit }}
      />
      <Button type="button" variant="ghost" onClick={props.onUseEmail}>
        {labels.useEmail}
      </Button>
    </div>
  );
}
