import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILES_URL,
  DEV_STORAGE_DIR,
  resolveStorageConfig,
} from "./config";
import { firstDownloadToday, looksLikeBot } from "./downloads";

describe("resolveStorageConfig", () => {
  const obs = {
    OBS_BUCKET: "trilleo-web-storage",
    OBS_REGION: "cn-southwest-2",
    OBS_ACCESS_KEY_ID: "AK",
    OBS_SECRET_ACCESS_KEY: "SK",
  };

  it("uses OBS when a bucket is configured", () => {
    expect(resolveStorageConfig(obs, false)).toEqual({
      kind: "obs",
      bucket: "trilleo-web-storage",
      region: "cn-southwest-2",
      accessKeyId: "AK",
      secretAccessKey: "SK",
      filesUrl: DEFAULT_FILES_URL,
    });
    expect(
      resolveStorageConfig(
        { ...obs, FILES_URL: " https://cdn.example " },
        false,
      ),
    ).toMatchObject({ filesUrl: "https://cdn.example" });
  });

  it("turns storage off when OBS is half configured", () => {
    expect(
      resolveStorageConfig({ OBS_BUCKET: "b", OBS_REGION: "r" }, false),
    ).toMatchObject({
      kind: "none",
      problem: expect.stringContaining("missing") as string,
    });
  });

  it("uses local storage in dev, e2e and tests", () => {
    expect(resolveStorageConfig({ STORAGE_URL: "memory://" }, false)).toEqual({
      kind: "local",
      root: null,
    });
    expect(resolveStorageConfig({ STORAGE_URL: "/tmp/files" }, false)).toEqual({
      kind: "local",
      root: "/tmp/files",
    });
    expect(resolveStorageConfig({}, true)).toEqual({
      kind: "local",
      root: DEV_STORAGE_DIR,
    });
  });

  it("has no storage in production until it's set up", () => {
    expect(resolveStorageConfig({}, false)).toEqual({ kind: "none" });
  });
});

describe("download counting", () => {
  it("counts each visitor once per file per day", () => {
    const day = new Date("2026-10-05T10:00:00Z");
    const visitor = { ip: "203.0.113.1", userAgent: "Firefox" };
    expect(firstDownloadToday("file1", visitor, day)).toBe(true);
    expect(firstDownloadToday("file1", visitor, day)).toBe(false);
    expect(firstDownloadToday("file2", visitor, day)).toBe(true);
    expect(
      firstDownloadToday("file1", { ...visitor, ip: "203.0.113.2" }, day),
    ).toBe(true);
    expect(
      firstDownloadToday("file1", visitor, new Date("2026-10-06T00:00:01Z")),
    ).toBe(true);
  });

  it("ignores crawlers", () => {
    expect(looksLikeBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(looksLikeBot("curl/8.4.0")).toBe(true);
    expect(looksLikeBot("Mozilla/5.0 (Windows NT 10.0) Firefox/140.0")).toBe(
      false,
    );
  });
});
