/**
 * Scroll reveals: elements marked `data-reveal` rise in the first time they scroll
 * into view (styles in styles/theme.css).
 *
 * Content is only hidden while <html data-motion> is set, which motionInitScript does
 * before first paint when the browser can observe intersections and the visitor
 * hasn't asked for reduced motion. bindReveal() then marks it "ready" (turning off
 * the CSS failsafe) and reveals elements as they arrive.
 */

import { MOTION, REDUCED_MOTION_QUERY } from "./motion";

export const MOTION_ATTR = "data-motion";

/** How many elements of one batch get their own delay before the rest go together. */
const MAX_STAGGER_STEPS = 8;

function noop(): void {
  // Nothing to clean up.
}

/**
 * Inline `<head>` script: opts the page into reveals. Dependency-free, like
 * themeInitScript; reveal.test.ts runs it.
 */
export const motionInitScript = `(function(){try{if("IntersectionObserver"in window&&!matchMedia(${JSON.stringify(
  REDUCED_MOTION_QUERY,
)}).matches)document.documentElement.setAttribute(${JSON.stringify(
  MOTION_ATTR,
)},"")}catch(e){}})();`;

/**
 * Observes every `[data-reveal]` element and marks it `data-revealed` once it
 * enters the viewport. Elements arriving together are staggered top to bottom.
 * Does nothing unless motionInitScript opted the page in. Returns a cleanup.
 */
export function bindReveal(doc: Document = document): () => void {
  const root = doc.documentElement;
  const win = doc.defaultView;
  if (
    !root.hasAttribute(MOTION_ATTR) ||
    !win ||
    !("IntersectionObserver" in win)
  )
    return noop;

  const observer = new win.IntersectionObserver(
    (entries) => {
      const arriving = entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        );
      arriving.forEach((entry, index) => {
        const element = entry.target as HTMLElement;
        const step = Math.min(index, MAX_STAGGER_STEPS);
        element.style.setProperty(
          "--tr-reveal-delay",
          `${String(Math.round(step * MOTION.stagger * 1000))}ms`,
        );
        element.setAttribute("data-revealed", "");
        observer.unobserve(element);
      });
    },
    // Reveal a little after the element's top crosses the bottom edge.
    { rootMargin: "0px 0px -6% 0px" },
  );

  for (const element of doc.querySelectorAll(
    "[data-reveal]:not([data-revealed])",
  ))
    observer.observe(element);
  root.setAttribute(MOTION_ATTR, "ready");

  return () => {
    observer.disconnect();
  };
}
