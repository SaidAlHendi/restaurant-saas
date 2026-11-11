import type { LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useLandingPage } from '../hooks/use-landing-page.js';
import { ClosingSection } from './ClosingSection.js';
import { FlowSection } from './FlowSection.js';
import { HeroSection } from './HeroSection.js';
import { KitchenSection } from './KitchenSection.js';
import { SiteShell } from './SiteShell.js';
import { TeaserSection } from './TeaserSection.js';

export type LandingPageProps = {
  locale: LandingLocale;
  tracking: TrackingIds;
};

/** Home: the promise, six real screens, the kitchen, then doors to plans, FAQ and contact. */
export function LandingPage({ locale, tracking }: LandingPageProps) {
  const vm = useLandingPage(locale, tracking);
  const { content } = vm;

  return (
    <SiteShell shell={vm.shell}>
      <HeroSection hero={content.hero} photos={content.photos} ctaHref={vm.links.contact} />
      <FlowSection flow={content.flow} curve={vm.curve} />
      <KitchenSection kitchen={content.kitchen} photo={content.photos.pass} />
      <TeaserSection teasers={content.teasers} plansHref={vm.links.plans} faqHref={vm.links.faq} />
      <ClosingSection
        closing={content.closing}
        wordmark={content.hero.wordmark}
        trialHref={vm.links.contact}
        photo={content.photos.tiramisu}
      />
    </SiteShell>
  );
}
