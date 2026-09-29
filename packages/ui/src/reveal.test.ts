import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REDUCED_MOTION_QUERY } from "./motion";
import { MOTION_ATTR, bindReveal, motionInitScript } from "./reveal";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

/** A controllable IntersectionObserver: `fire` delivers entries to the page's observer. */
function mockObserver() {
  let callback: Callback | undefined;
  const observed = new Set<Element>();
  class FakeObserver {
    constructor(cb: Callback) {
      callback = cb;
    }
    observe(element: Element) {
      observed.add(element);
    }
    unobserve(element: Element) {
      observed.delete(element);
    }
    disconnect() {
      observed.clear();
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return {
    observed,
    fire(elements: Element[], isIntersecting = true) {
      callback?.(
        elements.map((target, index) => ({
          target,
          isIntersecting,
          boundingClientRect: { top: index * 100, left: 0 } as DOMRectReadOnly,
        })),
      );
    },
  };
}

function addRevealables(count: number): HTMLElement[] {
  return Array.from({ length: count }, () => {
    const element = document.createElement("div");
    element.setAttribute("data-reveal", "");
    document.body.append(element);
    return element;
  });
}

beforeEach(() => {
  document.documentElement.removeAttribute(MOTION_ATTR);
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("motionInitScript", () => {
  function runInitScript() {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs our own constant; jsdom's <script> context can't see test stubs
    const run = new Function(motionInitScript) as () => void;
    run();
  }

  it("opts in when intersections can be observed and motion is fine", () => {
    mockObserver();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    runInitScript();
    expect(document.documentElement.hasAttribute(MOTION_ATTR)).toBe(true);
  });

  it("stays out under reduced motion", () => {
    mockObserver();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === REDUCED_MOTION_QUERY,
    }));
    runInitScript();
    expect(document.documentElement.hasAttribute(MOTION_ATTR)).toBe(false);
  });

  it("stays out without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    // `in` still sees a stubbed-undefined global, so remove it for real.
    const saved = Object.getOwnPropertyDescriptor(
      window,
      "IntersectionObserver",
    );
    Reflect.deleteProperty(window, "IntersectionObserver");
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    runInitScript();
    expect(document.documentElement.hasAttribute(MOTION_ATTR)).toBe(false);
    if (saved) Object.defineProperty(window, "IntersectionObserver", saved);
  });
});

describe("bindReveal", () => {
  it("does nothing unless the page opted in", () => {
    const observer = mockObserver();
    addRevealables(2);
    bindReveal(document);
    expect(observer.observed.size).toBe(0);
    expect(document.documentElement.hasAttribute(MOTION_ATTR)).toBe(false);
  });

  it("marks the page ready and reveals elements as they arrive, staggered", () => {
    const observer = mockObserver();
    document.documentElement.setAttribute(MOTION_ATTR, "");
    const [first, second, third] = addRevealables(3);
    if (!first || !second || !third) throw new Error("setup");

    bindReveal(document);
    expect(document.documentElement.getAttribute(MOTION_ATTR)).toBe("ready");
    expect(observer.observed.size).toBe(3);

    observer.fire([third], false);
    observer.fire([second, first]);
    expect(first.hasAttribute("data-revealed")).toBe(true);
    expect(second.hasAttribute("data-revealed")).toBe(true);
    expect(third.hasAttribute("data-revealed")).toBe(false);
    expect(second.style.getPropertyValue("--tr-reveal-delay")).toBe("0ms");
    expect(first.style.getPropertyValue("--tr-reveal-delay")).toBe("45ms");
    // Revealed once: no longer watched.
    expect([...observer.observed]).toEqual([third]);
  });

  it("caps the stagger so long batches don't lag", () => {
    const observer = mockObserver();
    document.documentElement.setAttribute(MOTION_ATTR, "");
    const elements = addRevealables(20);
    bindReveal(document);
    observer.fire(elements);
    expect(elements.at(-1)?.style.getPropertyValue("--tr-reveal-delay")).toBe(
      "360ms",
    );
  });

  it("skips elements that were already revealed and disconnects on cleanup", () => {
    const observer = mockObserver();
    document.documentElement.setAttribute(MOTION_ATTR, "");
    const [done] = addRevealables(2);
    done?.setAttribute("data-revealed", "");
    const cleanup = bindReveal(document);
    expect(observer.observed.size).toBe(1);
    cleanup();
    expect(observer.observed.size).toBe(0);
  });
});
