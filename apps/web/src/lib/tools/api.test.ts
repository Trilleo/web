import { openDatabase, type DatabaseHandle, type User } from "@trilleo/db";
import {
  MAX_KEYS_PER_TOOL,
  MAX_VALUE_BYTES,
  type ToolMeta,
} from "@trilleo/tool-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { handleToolData, type ToolDataRequest } from "./api";
import { putToolData } from "./store";

const ORIGIN = "https://www.trilleo.net";

/** A small tool for these tests: saves { text } objects. */
const memo: ToolMeta = {
  slug: "memo",
  name: "Memo",
  description: "Test tool.",
  status: "live",
  icon: "notes",
  isValidValue: (value) =>
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string",
};
const readOnly: ToolMeta = { ...memo, slug: "viewer", isValidValue: undefined };
const planned: ToolMeta = { ...memo, slug: "later", status: "planned" };
const TOOLS = [memo, readOnly, planned];

let handle: DatabaseHandle;
let alice: User;
let bob: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  alice = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "alice",
    name: null,
  });
  bob = await upsertGitHubUser(handle.db, { id: 2, login: "bob", name: null });
});
afterEach(async () => {
  await handle.close();
});

function call(
  method: string,
  path: string,
  options: {
    user?: User | null;
    body?: string;
    origin?: string | null;
    type?: string;
  } = {},
) {
  const url = new URL(path, ORIGIN);
  const [, , , tool, , key] = url.pathname.split("/");
  const headers = new Headers();
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin) headers.set("Origin", origin);
  if (options.body !== undefined)
    headers.set("Content-Type", options.type ?? "application/json");
  const input: ToolDataRequest = {
    request: new Request(url, { method, headers, body: options.body ?? null }),
    url,
    user: options.user === undefined ? alice : options.user,
    tool,
    key: key === undefined ? undefined : decodeURIComponent(key),
    getDb: () => Promise.resolve(handle.db),
    tools: TOOLS,
  };
  return handleToolData(input);
}

const put = (
  key: string,
  value: unknown,
  options: Parameters<typeof call>[2] = {},
) =>
  call("PUT", `/api/tools/memo/data/${key}`, {
    body: JSON.stringify({ value }),
    ...options,
  });

async function errorOf(response: Response): Promise<string> {
  const body = (await response.json()) as { error: string };
  return body.error;
}

describe("the tool data API", () => {
  it("saves, lists and deletes someone's items, never cached", async () => {
    const saved = await put("a1", { text: "hello" });
    expect(saved.status).toBe(200);
    expect(saved.headers.get("Cache-Control")).toBe("no-store");
    expect(await saved.json()).toMatchObject({
      key: "a1",
      value: { text: "hello" },
    });

    await put("a1", { text: "hello again" });
    const listed = await call("GET", "/api/tools/memo/data");
    expect(await listed.json()).toMatchObject({
      items: [{ key: "a1", value: { text: "hello again" } }],
    });

    expect((await call("DELETE", "/api/tools/memo/data/a1")).status).toBe(204);
    expect(await (await call("GET", "/api/tools/memo/data")).json()).toEqual({
      items: [],
    });
  });

  it("keeps people's items apart", async () => {
    await put("a1", { text: "alice's" });
    const bobs = await call("GET", "/api/tools/memo/data", { user: bob });
    expect(await bobs.json()).toEqual({ items: [] });
    await call("DELETE", "/api/tools/memo/data/a1", { user: bob });
    const alices = await call("GET", "/api/tools/memo/data");
    expect(await alices.json()).toMatchObject({ items: [{ key: "a1" }] });
  });

  it("needs someone signed in", async () => {
    const response = await call("GET", "/api/tools/memo/data", { user: null });
    expect(response.status).toBe(401);
    expect(await errorOf(response)).toMatch(/Sign in/);
  });

  it("knows only tools that exist and save data", async () => {
    for (const tool of ["nope", "viewer", "later"]) {
      expect((await call("GET", `/api/tools/${tool}/data`)).status).toBe(404);
    }
  });

  it("only accepts changes from this site", async () => {
    expect(
      (await put("a1", { text: "x" }, { origin: "https://evil.example" }))
        .status,
    ).toBe(403);
    expect((await put("a1", { text: "x" }, { origin: null })).status).toBe(403);
    expect(
      (
        await call("DELETE", "/api/tools/memo/data/a1", {
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
  });

  it("checks what's sent", async () => {
    expect(
      (await call("PUT", "/api/tools/memo/data/a1", { body: "{}" })).status,
    ).toBe(400);
    expect(
      (await call("PUT", "/api/tools/memo/data/a1", { body: "not json" }))
        .status,
    ).toBe(400);
    expect(
      (
        await call("PUT", "/api/tools/memo/data/a1", {
          body: "{}",
          type: "text/plain",
        })
      ).status,
    ).toBe(415);
    expect((await put("bad%20key", { text: "x" })).status).toBe(400);

    const wrongShape = await put("a1", { notText: 1 });
    expect(wrongShape.status).toBe(422);
    expect(await errorOf(wrongShape)).toBe("Memo can’t save that.");
  });

  it("refuses values over the size limit", async () => {
    const response = await put("a1", { text: "x".repeat(MAX_VALUE_BYTES) });
    expect(response.status).toBe(413);
    expect(await errorOf(response)).toMatch(/too big/);
  });

  it("caps the number of items, but still updates existing ones", async () => {
    for (let i = 0; i < MAX_KEYS_PER_TOOL; i++) {
      const result = await putToolData(handle.db, {
        userId: alice.id,
        tool: memo,
        key: `k${String(i)}`,
        value: { text: "" },
      });
      expect(result.ok).toBe(true);
    }
    const tooMany = await put("one-more", { text: "x" });
    expect(tooMany.status).toBe(422);
    expect(await errorOf(tooMany)).toMatch(/up to 500/);
    expect((await put("k0", { text: "updated" })).status).toBe(200);
  });

  it("allows only the methods it knows", async () => {
    expect((await call("POST", "/api/tools/memo/data")).status).toBe(405);
    expect((await call("GET", "/api/tools/memo/data/a1")).status).toBe(405);
  });
});
