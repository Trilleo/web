import { describe, expect, it } from "vitest";
import {
  HUMAN_CHECK_STATUS,
  demandOf,
  humanFetch,
  progressText,
} from "./client";
import { checkPow } from "./pow";

const demand = (route = "upload") =>
  Response.json(
    { error: "Show you’re a person first.", humanCheck: { route, level: 1 } },
    { status: HUMAN_CHECK_STATUS },
  );

/** A fake site: the guarded route wants a pass until /api/check/solve gets one. */
function site(challenge: Record<string, unknown>) {
  let passed = false;
  const calls: string[] = [];
  const answer = (path: string, init?: RequestInit): Response => {
    calls.push(path);
    if (path === "/api/check/challenge") return Response.json(challenge);
    if (path === "/api/check/solve") {
      const body = JSON.parse(init?.body as string) as { nonce: number };
      passed = checkPow("salt", 4, body.nonce);
      return new Response(null, { status: passed ? 204 : 422 });
    }
    return passed ? Response.json({ ok: true }) : demand();
  };
  const fetch = ((input: string, init?: RequestInit) =>
    Promise.resolve(answer(input, init))) as typeof globalThis.fetch;
  return { fetch, calls };
}

describe("humanFetch", () => {
  it("passes other answers through untouched", async () => {
    const fetch = (() =>
      Promise.resolve(
        Response.json({ hi: 1 }, { status: 404 }),
      )) as typeof globalThis.fetch;
    const response = await humanFetch(fetch)("/x");
    expect(response.status).toBe(404);
  });

  it("solves a proof-of-work and sends the request again", async () => {
    const { fetch, calls } = site({
      level: 1,
      token: "t",
      salt: "salt",
      bits: 4,
    });
    const seen: (string | null)[] = [];
    const response = await humanFetch(fetch, {
      onStatus: (text) => seen.push(text),
    })("/api/storage/uploads", { method: "POST", body: "{}" });
    expect(response.status).toBe(200);
    expect(calls).toEqual([
      "/api/storage/uploads",
      "/api/check/challenge",
      "/api/check/solve",
      "/api/storage/uploads",
    ]);
    expect(seen.at(-1)).toBeNull();
  });

  it("hands back the 428 when the check can't be had", async () => {
    const fetch = ((input: string) =>
      Promise.resolve(
        input === "/api/check/challenge"
          ? new Response(null, { status: 500 })
          : demand(),
      )) as typeof globalThis.fetch;
    const response = await humanFetch(fetch)("/api/x");
    expect(response.status).toBe(HUMAN_CHECK_STATUS);
    expect(await demandOf(response)).toBe("upload");
  });
});

describe("demandOf", () => {
  it("reads only the human check's 428s", async () => {
    expect(await demandOf(demand("avatar"))).toBe("avatar");
    expect(await demandOf(new Response("nope", { status: 428 }))).toBeNull();
    expect(
      await demandOf(Response.json({ humanCheck: { route: "x" } })),
    ).toBeNull();
  });
});

it("words progress as a chance", () => {
  expect(progressText(0, 100)).toBe("Checking you’re not a bot… 0%");
  expect(progressText(1e9, 100)).toBe("Checking you’re not a bot… 99%");
});
