import { openDatabase, type DatabaseHandle } from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import { handleStorageApi } from "./api";
import type { Requester, StorageDeps } from "./service";

const ORIGIN = "https://www.trilleo.net";

let handle: DatabaseHandle;
let deps: StorageDeps;
let admin: Requester;
let someone: Requester;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  deps = {
    db: handle.db,
    storage: new LocalDriver({ root: null, baseUrl: "/api/storage/local" }),
  };
  admin = {
    user: await upsertGitHubUser(handle.db, {
      id: 1,
      login: "owner",
      name: null,
    }),
    isAdmin: true,
  };
  someone = {
    user: await upsertGitHubUser(handle.db, {
      id: 2,
      login: "someone",
      name: null,
    }),
    isAdmin: false,
  };
});
afterEach(async () => {
  await handle.close();
});

function call(
  method: string,
  path: string,
  options: {
    requester?: Requester | null;
    body?: unknown;
    origin?: string | null;
    noStorage?: boolean;
  } = {},
) {
  const headers = new Headers();
  if (options.origin !== null) headers.set("origin", options.origin ?? ORIGIN);
  if (options.body !== undefined)
    headers.set("content-type", "application/json");
  const url = new URL(`/api/storage/${path}`, ORIGIN);
  return handleStorageApi({
    request: new Request(url, {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    url,
    requester: options.requester === undefined ? admin : options.requester,
    path,
    deps: () => Promise.resolve(options.noStorage ? null : deps),
  });
}

const start = { purpose: "site", name: "a.txt", size: 5 };

describe("storage API", () => {
  it("needs a signed-in person and this site's origin", async () => {
    expect(
      (await call("POST", "uploads", { requester: null, body: start })).status,
    ).toBe(401);
    expect(
      (
        await call("POST", "uploads", {
          origin: "https://evil.example",
          body: start,
        })
      ).status,
    ).toBe(403);
    expect(
      (await call("POST", "uploads", { origin: null, body: start })).status,
    ).toBe(403);
  });

  it("says when storage isn't set up", async () => {
    const response = await call("POST", "uploads", {
      body: start,
      noStorage: true,
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "File storage isn’t set up yet.",
    });
  });

  it("starts an upload and hands out part URLs", async () => {
    const response = await call("POST", "uploads", { body: start });
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as {
      file: { id: string; status: string };
      partCount: number;
    };
    expect(body).toMatchObject({
      file: { status: "uploading", pageUrl: `/files/${body.file.id}/` },
      partCount: 1,
    });

    const parts = await call("POST", `uploads/${body.file.id}/parts`, {
      body: { parts: [1] },
    });
    expect(parts.status).toBe(200);
    const urls = (await parts.json()) as {
      urls: Record<string, string>;
      expiresIn: number;
    };
    expect(urls.urls["1"]).toMatch(/^\/api\/storage\/local\//);
    expect(urls.expiresIn).toBe(3600);

    // Someone else can't see or touch it.
    expect(
      (await call("GET", `files/${body.file.id}`, { requester: someone }))
        .status,
    ).toBe(404);
    expect(
      (await call("DELETE", `uploads/${body.file.id}`, { requester: someone }))
        .status,
    ).toBe(404);
    expect((await call("GET", `files/${body.file.id}`)).status).toBe(200);
    expect((await call("DELETE", `uploads/${body.file.id}`)).status).toBe(204);
  });

  it("refuses bad requests", async () => {
    expect(
      (await call("POST", "uploads", { body: { name: "a" } })).status,
    ).toBe(400);
    expect(
      (await call("POST", "uploads", { requester: someone, body: start }))
        .status,
    ).toBe(403);
    expect((await call("GET", "uploads")).status).toBe(405);
    expect((await call("POST", "uploads/NOT-AN-ID/complete")).status).toBe(404);
    expect((await call("POST", "elsewhere")).status).toBe(404);
  });
});
