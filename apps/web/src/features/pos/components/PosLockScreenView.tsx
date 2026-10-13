import { Spinner } from '@app/ui';

import type { PosLockScreenViewModel } from '../hooks/use-pos-lock-screen.js';
import { PosPinPadView } from './PosPinPadView.js';

export function PosLockScreenView(props: PosLockScreenViewModel) {
  const { loading, users, pinPad, errorMessage, lockCountdown, labels } = props;

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold">{labels.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{labels.subtitle}</p>
      </header>
      <div className="w-full max-w-md space-y-4">
        <p className="text-muted-foreground text-sm font-medium">{labels.pickUser}</p>
        {users.length === 0 ? (
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
        <p className="text-destructive text-sm">{errorMessage}</p>
      ) : null}
      <PosPinPadView
        digits={pinPad.digits}
        canSubmit={pinPad.canSubmit}
        submitting={pinPad.submitting}
        onDigit={pinPad.onDigit}
        onBackspace={pinPad.onBackspace}
        onSubmit={pinPad.onSubmit}
        labels={{ backspace: labels.backspace, submit: labels.submit }}
      />
    </div>
  );
}
