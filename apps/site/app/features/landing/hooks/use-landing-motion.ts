import { useEffect, useRef } from 'react';

/**
 * Scroll-driven polish that must never block content:
 * - elements marked `data-reveal` that start below the fold fade in once when they come into view
 *   (they are fully visible without JavaScript and for reduced-motion visitors),
 * - `video[data-autoplay]` plays while at least half visible and pauses otherwise
 *   (reduced motion keeps the poster only).
 */
export function useLandingMotion() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset['reveal'] = 'in';
            revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    for (const el of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
        el.dataset['reveal'] = 'pending';
        revealObserver.observe(el);
      }
    }

    const videoObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            void video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.5 },
    );
    for (const video of root.querySelectorAll<HTMLVideoElement>('video[data-autoplay]')) {
      videoObserver.observe(video);
    }

    return () => {
      revealObserver.disconnect();
      videoObserver.disconnect();
    };
  }, []);

  return { rootRef };
}
