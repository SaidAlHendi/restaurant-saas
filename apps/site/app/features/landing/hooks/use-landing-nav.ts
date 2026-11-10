import { useCallback, useEffect, useState } from 'react';

import type { NavSectionId } from '../content/types.js';

/** Tailwind `md`: the menu button is only shown below this width. */
const DESKTOP_MIN_WIDTH = 768;

/**
 * Navbar state: shadow after scrolling, the mobile menu (closes on Escape, link tap or when the
 * window grows), and which section is being read so its link can be highlighted.
 */
export function useLandingNav(sectionIds: readonly NavSectionId[]) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<NavSectionId | null>(null);

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
    const targets = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id as NavSectionId);
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
  }, [sectionIds]);

  return { scrolled, menuOpen, activeId, toggleMenu, closeMenu };
}
