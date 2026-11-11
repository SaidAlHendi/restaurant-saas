import type { LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useContactPage } from '../hooks/use-contact-page.js';
import { useInnerPage } from '../hooks/use-inner-page.js';
import { ContactSection } from './ContactSection.js';
import { CtaSection } from './CtaSection.js';
import { FaqSection } from './FaqSection.js';
import { PlansSection } from './PlansSection.js';
import { SiteShell } from './SiteShell.js';

export type InnerPageProps = {
  locale: LandingLocale;
  tracking: TrackingIds;
};

export function PlansPage({ locale, tracking }: InnerPageProps) {
  const vm = useInnerPage(locale, tracking, 'plans');
  return (
    <SiteShell shell={vm.shell}>
      <PlansSection title={vm.content.plans.title} lead={vm.content.plans.lead} plans={vm.plans} />
      <CtaSection closing={vm.content.closing} href={vm.links.contact} />
    </SiteShell>
  );
}

export function FaqPage({ locale, tracking }: InnerPageProps) {
  const vm = useInnerPage(locale, tracking, 'faq');
  return (
    <SiteShell shell={vm.shell}>
      <FaqSection faq={vm.content.faq} />
      <CtaSection closing={vm.content.closing} href={vm.links.contact} />
    </SiteShell>
  );
}

export function ContactPage({ locale, tracking }: InnerPageProps) {
  const vm = useContactPage(locale, tracking);
  return (
    <SiteShell shell={vm.shell}>
      <ContactSection
        contact={vm.content.contact}
        form={vm.content.form}
        formState={vm.form}
        photo={vm.content.photos.room}
        email={vm.links.email}
        mailto={vm.links.mailto}
        privacyHref={vm.shell.links.privacy}
      />
    </SiteShell>
  );
}
