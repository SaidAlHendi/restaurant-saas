import type { LandingLocale } from '../../../lib/locale.js';
import { ConsentBanner } from '../../consent/components/ConsentBanner.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useLandingPage } from '../hooks/use-landing-page.js';
import { ClosingSection } from './ClosingSection.js';
import { FaqSection } from './FaqSection.js';
import { FlowSection } from './FlowSection.js';
import { HeroSection } from './HeroSection.js';
import { KitchenSection } from './KitchenSection.js';
import { LandingFooter } from './LandingFooter.js';
import { LandingNav } from './LandingNav.js';
import { PlansSection } from './PlansSection.js';

export type LandingPageProps = {
  locale: LandingLocale;
  tracking: TrackingIds;
};

export function LandingPage({ locale, tracking }: LandingPageProps) {
  const vm = useLandingPage(locale, tracking);
  const { content } = vm;

  return (
    <div ref={vm.rootRef} id="top" className="lp-root min-h-screen bg-foreground p-2 text-foreground">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2"
      >
        {content.skipLink}
      </a>
      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-2">
        <LandingNav content={content.nav} homeHref={`/${locale}`} nav={vm.nav} links={vm.links} />
        <main id="content" className="contents">
          <HeroSection hero={content.hero} photos={content.photos} />
          <FlowSection flow={content.flow} curve={vm.curve} />
          <KitchenSection kitchen={content.kitchen} photo={content.photos.pass} />
          <PlansSection title={content.plans.title} plans={vm.plans} />
          <FaqSection faq={content.faq} />
          <ClosingSection
            closing={content.closing}
            wordmark={content.hero.wordmark}
            trialHref={vm.links.trial}
            photo={content.photos.tiramisu}
          />
        </main>
        <LandingFooter footer={content.footer} links={vm.links} />
      </div>
      {vm.consent.showBanner ? (
        <ConsentBanner
          content={vm.consentContent}
          privacyHref={vm.links.privacy}
          onAccept={vm.consent.accept}
          onReject={vm.consent.reject}
        />
      ) : null}
    </div>
  );
}
