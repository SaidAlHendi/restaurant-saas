import { Button } from '@app/ui';

import type { LandingLocale } from '../../../lib/locale.js';
import { ConsentBanner } from '../../consent/components/ConsentBanner.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useThanksPage } from '../hooks/use-thanks-page.js';

export type ThanksPageProps = {
  locale: LandingLocale;
  tracking: TrackingIds;
};

/** Conversion page: the only place the lead event fires (after consent). Kept out of search results. */
export function ThanksPage({ locale, tracking }: ThanksPageProps) {
  const vm = useThanksPage(locale, tracking);
  return (
    <main className="lp-root flex min-h-screen items-center justify-center bg-foreground p-4 text-background">
      <div className="max-w-xl rounded-[10px] bg-primary p-8 text-primary-foreground md:p-12">
        <h1 className="lp-display lp-med">{vm.content.heading}</h1>
        <p className="mt-4 text-lg">{vm.content.body}</p>
        <Button asChild variant="secondary" size="touch" className="mt-8">
          <a href={vm.homeHref}>{vm.content.back}</a>
        </Button>
      </div>
      {vm.consent.showBanner ? (
        <ConsentBanner
          content={vm.consentContent}
          privacyHref={vm.privacyHref}
          onAccept={vm.consent.accept}
          onReject={vm.consent.reject}
        />
      ) : null}
    </main>
  );
}
