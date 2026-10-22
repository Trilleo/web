import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HotfixApp } from "./HotfixApp";
import { RECORDS_KEY } from "./ui/records";

// jsdom has no canvas, layout or matchMedia: the game runs, it just draws nothing.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        // Nothing to measure in jsdom.
      }
      disconnect() {
        // Nothing to stop.
      }
    },
  );
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HotfixApp", () => {
  it("offers a run, takes the keyboard, and starts on Space", () => {
    render(<HotfixApp seed={3} />);
    const field = screen.getByRole("application");
    expect(document.activeElement).toBe(field);
    expect(screen.getByRole("button", { name: /^Run/ })).toBeTruthy();
    fireEvent.keyDown(field, { code: "Space" });
    expect(screen.queryByRole("button", { name: /^Run/ })).toBeNull();
  });

  it("shows the best score kept in this browser", () => {
    localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify({ best: 1234, furthest: 1000, runs: 2, tokens: 23 }),
    );
    render(<HotfixApp seed={3} />);
    expect(screen.getByTestId("best").textContent).toBe("01234");
  });

  it("pauses when the game loses focus, and carries on with Space", () => {
    render(<HotfixApp seed={3} />);
    const field = screen.getByRole("application");
    fireEvent.keyDown(field, { code: "Space" });
    fireEvent.keyUp(field, { code: "Space" });
    act(() => {
      field.blur();
    });
    expect(screen.getByText("Paused")).toBeTruthy();
    fireEvent.keyDown(field, { code: "Space" });
    expect(screen.queryByText("Paused")).toBeNull();
  });
});
