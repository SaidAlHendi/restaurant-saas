import type { LandingContent } from '../content/types.js';
import type { LandingPageViewModel } from '../hooks/use-landing-page.js';

export type LandingFooterProps = {
  footer: LandingContent['footer'];
  links: LandingPageViewModel['links'];
};

export function LandingFooter({ footer, links }: LandingFooterProps) {
  return (
    <footer className="col-span-12 flex flex-wrap justify-between gap-2 px-3 py-2.5 text-sm text-accent-2">
      <span>{footer.rights}</span>
      <nav className="flex gap-3">
        <a className="underline-offset-4 hover:underline" href={links.privacy}>
          {footer.privacy}
        </a>
        <a className="underline-offset-4 hover:underline" href={links.terms}>
          {footer.terms}
        </a>
        <a className="underline-offset-4 hover:underline" href={links.contact}>
          {footer.contact}
        </a>
      </nav>
    </footer>
  );
}
