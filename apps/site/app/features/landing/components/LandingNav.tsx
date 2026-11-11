import { Button, cn } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import type { SiteShellViewModel } from '../hooks/use-site-shell.js';

export type LandingNavProps = {
  content: LandingContent['nav'];
  nav: SiteShellViewModel['nav'];
  navLinks: SiteShellViewModel['navLinks'];
  links: SiteShellViewModel['links'];
};

export function LandingNav({ content, nav, navLinks, links }: LandingNavProps) {
  return (
    <header
      className={cn(
        'sticky top-2 z-50 col-span-12 rounded-[10px] bg-background px-3 py-2.5 ps-5 transition-shadow',
        nav.scrolled && 'shadow-[0_16px_34px_-14px_rgba(0,0,0,0.55)]',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <a
          href={links.home}
          aria-label={content.brandLabel}
          className="lp-display flex items-center gap-1 text-[34px] leading-none text-primary"
        >
          <span>{content.brand}</span>
          <span aria-hidden className="mt-3 size-[9px] rounded-full bg-warning" />
        </a>

        <nav aria-label={content.ariaLabel} className="hidden gap-1 text-[15px] font-medium md:flex">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              aria-current={link.current}
              className={cn(
                'rounded-lg px-4 py-3 text-foreground/75 transition-colors hover:bg-accent hover:text-foreground',
                link.active && 'bg-foreground text-background hover:bg-foreground hover:text-background',
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href={links.switchHref}
            lang={links.switchLang}
            hrefLang={links.switchLang}
            aria-label={content.switchName}
            className="hidden rounded-lg px-3 py-2 text-[13px] font-medium ring-1 ring-foreground ring-inset transition-colors hover:bg-foreground hover:text-background md:inline-block"
          >
            {content.switchLabel}
          </a>
          <Button asChild size="lg" className="hidden md:inline-flex">
            <a href={links.contact}>{content.cta}</a>
          </Button>
          <button
            type="button"
            aria-expanded={nav.menuOpen}
            aria-controls="landing-menu"
            aria-label={content.menuLabel}
            onClick={nav.toggleMenu}
            className="group relative size-11 rounded-lg bg-accent text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
          >
            <span className="lp-burger-line top-[17px] group-aria-expanded:top-[21px] group-aria-expanded:rotate-45" />
            <span className="lp-burger-line top-[25px] group-aria-expanded:top-[21px] group-aria-expanded:-rotate-45" />
          </button>
        </div>
      </div>

      <div
        id="landing-menu"
        className={cn(
          'absolute inset-x-0 top-[calc(100%+0.5rem)] gap-1 rounded-[10px] bg-background p-3 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.6)] md:hidden',
          nav.menuOpen ? 'grid' : 'hidden',
        )}
      >
        {navLinks.map((link) => (
          <a
            key={link.key}
            href={link.href}
            onClick={nav.closeMenu}
            aria-current={link.current}
            className={cn(
              'rounded-lg px-3.5 py-4 text-[19px] font-medium hover:bg-accent',
              link.active && 'bg-accent',
            )}
          >
            {link.label}
          </a>
        ))}
        <a
          href={links.switchHref}
          lang={links.switchLang}
          hrefLang={links.switchLang}
          className="rounded-lg px-3.5 py-4 text-[19px] font-medium hover:bg-accent"
        >
          {content.switchName}
        </a>
        <Button asChild size="touch" className="mt-1.5">
          <a href={links.contact} onClick={nav.closeMenu}>
            {content.cta}
          </a>
        </Button>
      </div>
    </header>
  );
}
