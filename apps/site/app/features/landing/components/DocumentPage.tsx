import type { LandingLocale } from '../../../lib/locale.js';
import type { TrackingIds } from '../../consent/tracking.js';
import { useDocumentPage } from '../hooks/use-document-page.js';
import { SiteShell } from './SiteShell.js';
import { Tile } from './Tile.js';

export type DocumentPageProps = {
  locale: LandingLocale;
  kind: 'privacy' | 'terms';
  tracking: TrackingIds;
};

/** Privacy and terms: plain, readable text inside the shared frame. */
export function DocumentPage({ locale, kind, tracking }: DocumentPageProps) {
  const vm = useDocumentPage(locale, kind, tracking);
  return (
    <SiteShell shell={vm.shell}>
      <Tile as="article" tone="paper" className="justify-start md:min-h-[60vh] md:p-12">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="lp-display lp-med">{vm.page.title}</h1>
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
        </div>
      </Tile>
    </SiteShell>
  );
}
