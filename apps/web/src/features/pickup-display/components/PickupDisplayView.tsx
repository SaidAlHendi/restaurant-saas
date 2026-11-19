import { Button, Spinner } from '@app/ui';

import type { usePickupDisplayPage } from '../hooks/use-pickup-display-page.js';

export type PickupDisplayViewProps = ReturnType<typeof usePickupDisplayPage>;

/** Customer-facing screen: big numbers for orders that are ready. No login. */
export function PickupDisplayView({
  isLoading,
  notFound,
  isError,
  title,
  orgName,
  entries,
  soundOn,
  onEnableSound,
  labels,
}: PickupDisplayViewProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label={labels.loading} />
      </div>
    );
  }
  if (notFound || isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center text-xl">
        {notFound ? labels.notFound : labels.error}
      </div>
    );
  }
  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col gap-8 p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-lg">{orgName}</p>
          <h1 className="text-4xl font-bold">{labels.heading}</h1>
          <p className="text-muted-foreground text-base">{title}</p>
        </div>
        {soundOn ? (
          <span className="text-muted-foreground text-sm">{labels.soundOn}</span>
        ) : (
          <Button type="button" size="touch" variant="outline" onClick={onEnableSound}>
            {labels.enableSound}
          </Button>
        )}
      </header>
      {entries.length === 0 ? (
        <p className="text-muted-foreground m-auto text-2xl">{labels.empty}</p>
      ) : (
        <ul
          className="grid flex-1 content-start gap-6 [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))]"
          aria-live="polite"
        >
          {entries.map((entry) => (
            <li
              key={entry.key}
              className="bg-primary text-primary-foreground flex items-center justify-center rounded-2xl py-8 text-7xl font-bold tabular-nums"
            >
              {entry.number}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
