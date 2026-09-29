import { beforeEach, describe, expect, it } from "vitest";
import { morphGuardScript } from "./page-transition";

/** A named morph element whose box sits at `top` (the viewport is jsdom's 768px). */
function addMorph(name: string, top: number, role = ""): HTMLElement {
  const element = document.createElement("h1");
  element.setAttribute("data-morph", role);
  element.style.setProperty("view-transition-name", name);
  element.getBoundingClientRect = () =>
    ({ top, bottom: top + 50, left: 0, right: 100 }) as DOMRect;
  document.body.append(element);
  return element;
}

/** Fires `pagereveal` like a navigation would; returns a way to end the transition. */
function reveal(withTransition = true): () => Promise<void> {
  let finish: (() => void) | undefined;
  const event = new Event("pagereveal");
  Object.defineProperty(event, "viewTransition", {
    value: withTransition
      ? {
          finished: new Promise<void>((resolve) => {
            finish = resolve;
          }),
        }
      : null,
  });
  window.dispatchEvent(event);
  return async () => {
    finish?.();
    await Promise.resolve();
    await Promise.resolve();
  };
}

// The script adds a window listener each run; one run covers every test.
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs our own constant; jsdom's <script> context can't see test stubs
const install = new Function(morphGuardScript) as () => void;
install();

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("morphGuardScript", () => {
  it("keeps on-screen morphs and unnames off-screen ones until the transition ends", async () => {
    const visible = addMorph("post-a", 100);
    const below = addMorph("post-b", 2000);
    const above = addMorph("post-c", -400);

    const finish = reveal();
    expect(visible.style.getPropertyValue("view-transition-name")).toBe(
      "post-a",
    );
    expect(below.style.getPropertyValue("view-transition-name")).toBe("none");
    expect(above.style.getPropertyValue("view-transition-name")).toBe("none");

    await finish();
    expect(below.style.getPropertyValue("view-transition-name")).toBe("post-b");
    expect(above.style.getPropertyValue("view-transition-name")).toBe("post-c");
  });

  it("never lands a morph on a list item, even on screen", async () => {
    const row = addMorph("post-a", 100, "from");
    const finish = reveal();
    expect(row.style.getPropertyValue("view-transition-name")).toBe("none");
    await finish();
    expect(row.style.getPropertyValue("view-transition-name")).toBe("post-a");
  });

  it("leaves pages that arrive without a transition alone", () => {
    const below = addMorph("post-b", 2000);
    reveal(false);
    expect(below.style.getPropertyValue("view-transition-name")).toBe("post-b");
  });
});
