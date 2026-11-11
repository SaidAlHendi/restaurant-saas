import { useCallback, useEffect, useState } from 'react';

import type { NavKey, NavSectionId } from '../content/types.js';
import type { CurrentPage } from '../landing.utils.js';

/** Tailwind `md`: the menu button is only shown below this width. */
const DESKTOP_MIN_WIDTH = 768;

const NAV_KEYS: readonly string[] = ['flow', 'kitchen', 'plans', 'faq', 'contact'];

/**
 * Navbar state: shadow after scrolling, the mobile menu (closes on Escape, link tap or when the
 * window grows), and which link is current. On the home page that is the section being read; on
 * every other page it is the page itself.
 */
export function useLandingNav(sectionIds: readonly NavSectionId[], current: CurrentPage) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSectionId | null>(null);

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_MIN_WIDTH) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (current !== 'home') {
      return undefined;
    }
    const targets = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as NavSectionId);
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const target of targets) {
      observer.observe(target);
    }
    return () => {
      observer.disconnect();
    };
  }, [sectionIds, current]);

  const activeKey: NavKey | null =
    current === 'home' ? activeSection : NAV_KEYS.includes(current) ? (current as NavKey) : null;

  return { scrolled, menuOpen, activeKey, toggleMenu, closeMenu };
}
