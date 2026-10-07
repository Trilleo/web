import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_JAVA_VERSIONS,
  JavaVersionList,
  compareVersions,
  groupByLine,
  mergeVersions,
  parseManifest,
} from "./game-versions";

const manifest = {
  latest: { release: "26.4", snapshot: "26w41a" },
  versions: [
    {
      id: "26w41a",
      type: "snapshot",
      releaseTime: "2026-10-06T10:00:00+00:00",
    },
    { id: "26.4", type: "release", releaseTime: "2026-09-30T10:00:00+00:00" },
    { id: "26.3", type: "release", releaseTime: "2026-07-01T10:00:00+00:00" },
    {
      id: "b1.7.3",
      type: "old_beta",
      releaseTime: "2011-07-08T00:00:00+00:00",
    },
  ],
};

describe("version lists", () => {
  it("reads releases from Mojang's manifest", () => {
    expect(parseManifest(manifest)).toEqual(["26.4", "26.3"]);
    expect(parseManifest({ nope: true })).toBeNull();
  });

  it("sorts newest first, numerically", () => {
    expect(
      ["1.21", "1.21.10", "1.21.9", "26.1", "1.21.1"].sort(compareVersions),
    ).toEqual(["26.1", "1.21.10", "1.21.9", "1.21.1", "1.21"]);
  });

  it("merges the live list with the fallback", () => {
    const merged = mergeVersions(["26.4", "26.3"]);
    expect(merged[0]).toBe("26.4");
    expect(merged).toContain("1.8.9");
    expect(new Set(merged).size).toBe(merged.length);
  });

  it("groups versions by line", () => {
    expect(groupByLine(["1.21.4", "1.21.3", "1.20.6", "26.1"])).toEqual([
      { line: "1.21", versions: ["1.21.4", "1.21.3"] },
      { line: "1.20", versions: ["1.20.6"] },
      { line: "26.1", versions: ["26.1"] },
    ]);
  });
});

describe("JavaVersionList", () => {
  it("fetches once, then serves from memory until it's stale", async () => {
    let now = 0;
    const fetch = vi.fn(() => Promise.resolve(Response.json(manifest)));
    const list = new JavaVersionList({ fetch, env: {}, now: () => now });
    expect((await list.versions())[0]).toBe("26.4");
    await list.versions();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(list.status().source).toBe("mojang");

    now = 7 * 60 * 60 * 1000;
    await list.versions();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to the list kept here when Mojang can't be reached", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetch = vi.fn(() => Promise.reject(new Error("offline")));
    const list = new JavaVersionList({ fetch, env: {}, now: () => 0 });
    expect(await list.versions()).toEqual(FALLBACK_JAVA_VERSIONS);
    expect(list.status().source).toBe("fallback");
    // And doesn't hammer it.
    await list.versions();
    expect(fetch).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("never fetches when switched off", async () => {
    const fetch = vi.fn();
    const list = new JavaVersionList({
      fetch,
      env: { MINECRAFT_VERSION_MANIFEST: "off" },
    });
    expect(await list.versions()).toEqual(FALLBACK_JAVA_VERSIONS);
    expect(fetch).not.toHaveBeenCalled();
  });
});
