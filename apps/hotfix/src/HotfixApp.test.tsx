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

  it("signed in, shows the record, achievements and what's unlocked", () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
    render(
      <HotfixApp
        seed={3}
        signedIn
        account={{
          runs: 4,
          tokens: 12,
          furthest: 480,
          achievements: ["hello-world"],
          accessory: "cap",
          endless: { id: "x", score: 600, metres: 480, rank: 2 },
          daily: null,
        }}
      />,
    );
    expect(screen.getByTestId("best").textContent).toBe("00600");
    expect(screen.getByText("00600 · #2")).toBeTruthy();
    const cap = screen.getByRole<HTMLInputElement>("radio", { name: /^Cap/ });
    expect(cap.checked).toBe(true);
    const crown = screen.getByRole<HTMLInputElement>("radio", {
      name: /^Crown/,
    });
    expect(crown.disabled).toBe(true);
    expect(screen.getByText("Hello, world").textContent).toContain("earned");
  });

  it("offers a run from the leaderboard to watch", () => {
    render(
      <HotfixApp
        seed={3}
        watch={{
          seed: 9,
          inputs: [],
          rules: 1,
          score: 321,
          name: "Ada",
          accessory: null,
          board: "endless",
        }}
      />,
    );
    expect(screen.getByText(/Ada’s run/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Watch" }));
    expect(screen.queryByRole("button", { name: "Watch" })).toBeNull();
  });
});
