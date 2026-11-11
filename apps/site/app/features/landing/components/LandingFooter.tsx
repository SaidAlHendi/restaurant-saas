import type { LandingContent } from '../content/types.js';
import type { SiteShellViewModel } from '../hooks/use-site-shell.js';

export type LandingFooterProps = {
  footer: LandingContent['footer'];
  links: SiteShellViewModel['links'];
  onCookieSettings: () => void;
};

export function LandingFooter({ footer, links, onCookieSettings }: LandingFooterProps) {
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
        <button type="button" className="underline-offset-4 hover:underline" onClick={onCookieSettings}>
          {footer.cookieSettings}
        </button>
      </nav>
    </footer>
  );
}
