import { useEffect, useRef } from 'react';

import { buildCurvePath, curveProgress } from '../landing.utils.js';

/**
 * One curved line drawn behind the product screens as the section scrolls into view.
 * The path is measured from the real card positions, so it follows RTL and LTR layouts alike.
 * With reduced motion the finished line is shown at once. On small screens the SVG is hidden by CSS.
 */
export function useCurveLine() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!section || !svg || !path) {
      return undefined;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layout = () => {
      const box = section.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${String(box.width)} ${String(box.height)}`);
      const points = [...section.querySelectorAll<HTMLElement>('[data-curve-card]')].map((card) => {
        const rect = card.getBoundingClientRect();
        return { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
      });
      path.setAttribute('d', buildCurvePath(box.width, box.height, points));
    };

    const draw = () => {
      const box = section.getBoundingClientRect();
      path.style.strokeDashoffset = String(1 - curveProgress(box.top, box.height, window.innerHeight));
    };

    const update = () => {
      layout();
      if (reduceMotion) {
        path.style.strokeDashoffset = '0';
      } else {
        draw();
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    if (!reduceMotion) {
      window.addEventListener('scroll', draw, { passive: true });
    }
    // Images and videos settle after hydration and move the cards a little.
    const observer = new ResizeObserver(update);
    observer.observe(section);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('load', update);
      window.removeEventListener('scroll', draw);
      observer.disconnect();
    };
  }, []);

  return { sectionRef, svgRef, pathRef };
}
