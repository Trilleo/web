import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ChartManifest } from "@trilleo/chunithm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChartViewer, POLL_MS } from "./ChartViewer";

const manifest: ChartManifest = {
  v: 1,
  width: 200,
  height: 3000,
  gutter: 50,
  lane: 150,
  tiles: [
    { url: "/t/0.webp", height: 2048 },
    { url: "/t/1.webp", height: 952 },
  ],
  measures: [24, 408, 792],
  columns: 3,
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  // jsdom has no ResizeObserver: one that never reports is enough here.
  globalThis.ResizeObserver = class {
    observe = () => undefined;
    disconnect = () => undefined;
    unobserve = () => undefined;
  };
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = () => undefined;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the chart viewer", () => {
  it("asks until the picture is built, then shows it from measure 1", async () => {
    const answers = [
      { status: "queued" },
      { status: "building" },
      { status: "ready", manifest, builtAt: "2026-10-24T00:00:00Z" },
    ];
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json(answers.shift() ?? answers[0])),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ChartViewer
        songId={3062}
        difficulty="master"
        label="Song, Master 14+"
        initial={null}
        hasMirror
        signedIn={false}
        signInHref="/sign-in"
      />,
    );
    expect(screen.getByTestId("chart-status").textContent).toContain(
      "Joining the chart",
    );
    for (let i = 0; i < 3; i++)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_MS);
      });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]).toBeDefined();
    expect(screen.getByTestId("chart-picture")).toBeTruthy();
    expect(screen.getByTestId("chart-measure").textContent).toBe(
      "Measure 1 of 3",
    );
    // Tiles are placed from the bottom: the first tile is the lowest.
    const images = screen.getByTestId("chart-picture").querySelectorAll("img");
    expect([...images].map((img) => img.getAttribute("src"))).toEqual([
      "/t/0.webp",
      "/t/1.webp",
    ]);
  });

  it("says when a chart is on plain lanes, without measure numbers", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(
      <ChartViewer
        songId={1179}
        difficulty="ultima"
        label="Lapis, Ultima 14+"
        initial={{
          status: "ready",
          manifest: { ...manifest, measures: [], plainLanes: true },
          builtAt: "2026-10-28T00:00:00Z",
        }}
        hasMirror={false}
        signedIn={false}
        signInHref="/sign-in"
      />,
    );
    expect(screen.getByTestId("chart-plain-lanes").textContent).toContain(
      "plain lanes",
    );
    expect(screen.queryByTestId("chart-measure")).toBeNull();
    expect(screen.getByTestId("chart-picture")).toBeTruthy();
  });

  it("says why a picture can't be shown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({ status: "unavailable", reason: "no-page" }),
        ),
      ),
    );
    render(
      <ChartViewer
        songId={1}
        difficulty="master"
        label="Song"
        initial={null}
        hasMirror={false}
        signedIn={false}
        signInHref="/sign-in"
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByTestId("chart-status").textContent).toBe(
      "sdvx.in hasn't drawn this chart yet.",
    );
  });

  it("keeps a favourite in this browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    render(
      <ChartViewer
        songId={3062}
        difficulty="master"
        label="Song"
        initial={{ status: "ready", manifest, builtAt: "x" }}
        hasMirror={false}
        signedIn={false}
        signInHref="/sign-in"
      />,
    );
    // The saved items load from this browser first (instantly, outside a test).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "☆ Save" }));
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByRole("button", { name: "★ Saved" })).toBeTruthy();
    const saved = JSON.parse(
      localStorage.getItem("trilleo:tool:chunithm") ?? "{}",
    ) as Record<string, { value: unknown }>;
    expect(saved["f-3062-master"]?.value).toEqual({ kind: "favourite" });
    // Viewing it also put it in the recent list.
    expect(saved["r-3062-master"]?.value).toMatchObject({ kind: "recent" });
  });
});
