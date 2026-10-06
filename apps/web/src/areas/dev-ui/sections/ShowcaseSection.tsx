import type { ReactNode } from 'react';

export function ShowcaseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b pb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ShowcaseRow({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
