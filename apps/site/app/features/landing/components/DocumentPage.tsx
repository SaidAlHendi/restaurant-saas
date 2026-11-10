import { Button } from '@app/ui';

import type { LandingLocale } from '../../../lib/locale.js';
import { ConsentBanner } from '../../consent/components/ConsentBanner.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useDocumentPage } from '../hooks/use-document-page.js';

export type DocumentPageProps = {
  locale: LandingLocale;
  kind: 'privacy' | 'terms';
  tracking: TrackingIds;
};

/** Privacy and terms: plain, readable text with a way back and a contact address. */
export function DocumentPage({ locale, kind, tracking }: DocumentPageProps) {
  const vm = useDocumentPage(locale, kind, tracking);
  return (
    <div className="lp-root min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <a href={vm.homeHref} className="lp-display text-[34px] leading-none text-primary">
          {vm.brand}
        </a>
        <Button asChild variant="outline" size="md">
          <a href={vm.homeHref}>{vm.back}</a>
        </Button>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="lp-display lp-med mt-6">{vm.page.title}</h1>
        {vm.page.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-medium">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-base leading-7 text-foreground/75">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <p className="mt-10 text-base">
          <a className="underline underline-offset-4" href={`mailto:${vm.contactEmail}`}>
            {vm.contactEmail}
          </a>
        </p>
      </main>
      {vm.consent.showBanner ? (
        <ConsentBanner
          content={vm.consentContent}
          privacyHref={vm.privacyHref}
          onAccept={vm.consent.accept}
          onReject={vm.consent.reject}
        />
      ) : null}
    </div>
  );
}
