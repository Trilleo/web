import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readBytes } from "./driver";
import { serveHeaders } from "./files";
import { LocalDriver } from "./local";

const bytes = (text: string) => new TextEncoder().encode(text);
const text = async (stream: ReadableStream<Uint8Array>) =>
  new TextDecoder().decode(await readBytes(stream));

/** The path after the base URL, as the site's route would pass it. */
const pathOf = (url: string) => url.replace(/^\/storage\//, "");

let folder: string;
beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "trilleo-storage-"));
});
afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe.each([
  ["memory", () => null],
  ["folder", () => folder],
])("LocalDriver (%s)", (_name, root) => {
  const make = (now = Date.now) =>
    new LocalDriver({ root: root(), baseUrl: "/storage/", now });

  it("takes a multipart upload through its signed URLs", async () => {
    const driver = make();
    const key = "f/aaaaaaaaaaaa/hello.txt";
    const uploadId = await driver.startUpload(key, serveHeaders("hello.txt"));

    for (const [n, part] of [
      [2, "world"],
      [1, "hello "],
    ] as const) {
      const url = await driver.partUrl(key, uploadId, n, 60);
      expect(url.startsWith("/storage/")).toBe(true);
      const response = await driver.handle(
        new Request("http://x/", { method: "PUT", body: bytes(part) }),
        pathOf(url),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("ETag")).toMatch(/^"[0-9a-f]{32}"$/);
    }

    const parts = await driver.listParts(key, uploadId);
    expect(parts.map((part) => [part.partNumber, part.size])).toEqual([
      [1, 6],
      [2, 5],
    ]);
    await driver.finishUpload(key, uploadId, parts);

    expect(await driver.head(key)).toEqual({
      size: 11,
      contentType: "text/plain",
    });
    expect(await text(await driver.read(key))).toBe("hello world");
    expect(await text(await driver.read(key, { start: 6, end: 9 }))).toBe(
      "wor",
    );
    // The parts are gone once joined.
    await expect(driver.listParts(key, uploadId)).rejects.toThrow();
  });

  it("serves objects publicly only once they're public", async () => {
    const driver = make();
    const key = "f/bbbbbbbbbbbb/pic.png";
    const uploadId = await driver.startUpload(key, serveHeaders("pic.png"));
    await driver.putPart(uploadId, 1, bytes("png!"));
    await driver.finishUpload(
      key,
      uploadId,
      await driver.listParts(key, uploadId),
    );

    const get = () =>
      driver.handle(new Request("http://x/"), pathOf(driver.publicUrl(key)));
    expect((await get()).status).toBe(404);

    await driver.setPublic(key, true);
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toMatch(/^inline/);
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "sandbox",
    );
    expect(await response.text()).toBe("png!");

    await driver.setPublic(key, false);
    expect((await get()).status).toBe(404);

    // A signed link works while it's private, as a download.
    const signed = await driver.signedUrl(key, 60, { filename: "Pic.png" });
    const download = await driver.handle(
      new Request("http://x/"),
      pathOf(signed),
    );
    expect(download.status).toBe(200);
    expect(download.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="Pic.png"/,
    );
    expect(download.headers.get("Cache-Control")).toBe("private, no-store");

    await driver.remove(key);
    expect(await driver.head(key)).toBeNull();
  });

  it("refuses tampered and expired links", async () => {
    let now = 1_000_000;
    const driver = make(() => now);
    const key = "f/cccccccccccc/a.txt";
    const uploadId = await driver.startUpload(key, serveHeaders("a.txt"));
    const url = await driver.partUrl(key, uploadId, 1, 60);
    const put = (path: string) =>
      driver.handle(
        new Request("http://x/", { method: "PUT", body: bytes("x") }),
        path,
      );

    const [payload, mac] = pathOf(url).split(".");
    const forged = Buffer.from(
      JSON.stringify({ op: "part", key, uploadId, part: 2, exp: now * 2 }),
    ).toString("base64url");
    expect((await put(`${forged}.${mac ?? ""}`)).status).toBe(403);
    expect((await put(`${payload ?? ""}.AAAA`)).status).toBe(403);

    now += 61_000;
    expect((await put(pathOf(url))).status).toBe(403);
  });

  it("forgets aborted uploads", async () => {
    const driver = make();
    const key = "f/dddddddddddd/a.txt";
    const uploadId = await driver.startUpload(key, serveHeaders("a.txt"));
    await driver.putPart(uploadId, 1, bytes("x"));
    await driver.abortUpload(key, uploadId);
    await expect(driver.putPart(uploadId, 1, bytes("x"))).rejects.toThrow(
      "No such upload",
    );
    // Aborting again is fine.
    await driver.abortUpload(key, uploadId);
  });
});
