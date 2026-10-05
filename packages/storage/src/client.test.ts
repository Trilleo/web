import { describe, expect, it, vi } from "vitest";
import type { StoredFileSummary } from "./api-types";
import {
  PartError,
  UploadError,
  uploadFile,
  type PartTransport,
} from "./client";

const summary = (status: StoredFileSummary["status"]): StoredFileSummary => ({
  id: "abc123def456",
  name: "a.bin",
  size: 10,
  kind: "data",
  label: "BIN file",
  status,
  visibility: "public",
  statusReason: null,
  pageUrl: "/files/abc123def456/",
  publicUrl: null,
});

const urlOf = (input: RequestInfo | URL) =>
  input instanceof Request ? input.url : input.toString();

interface FakeSite {
  fetch: typeof fetch;
  calls: { method: string; path: string; body: unknown }[];
}

/** The site's storage API, answering like the real routes. */
function fakeSite(
  partCount: number,
  partSize: number,
  options: { refuseStart?: string; expiresIn?: number } = {},
): FakeSite {
  const calls: FakeSite["calls"] = [];
  const answer = (input: RequestInfo | URL, init?: RequestInit): Response => {
    const path = urlOf(input);
    const method = init?.method ?? "GET";
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    if (path === "/api/storage/uploads") {
      if (options.refuseStart)
        return Response.json({ error: options.refuseStart }, { status: 413 });
      return Response.json(
        { file: summary("uploading"), partSize, partCount },
        { status: 201 },
      );
    }
    if (path.endsWith("/parts")) {
      const { parts } = body as { parts: number[] };
      return Response.json({
        urls: Object.fromEntries(
          parts.map((n) => [n, `https://s3/part-${String(n)}`]),
        ),
        expiresIn: options.expiresIn ?? 3600,
      });
    }
    if (path.endsWith("/complete"))
      return Response.json({ file: summary("published") });
    if (method === "DELETE") return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  };
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(answer(input, init)),
  ) as typeof globalThis.fetch;
  return { fetch, calls };
}

const noSleep = () => Promise.resolve();

describe("uploadFile", () => {
  it("sends every part and completes the upload", async () => {
    const site = fakeSite(3, 4);
    const file = new File(["0123456789"], "a.bin");
    const received = new Map<string, string>();
    const putPart: PartTransport = async (url, body, onProgress) => {
      received.set(url, await body.text());
      onProgress(body.size);
    };
    const progress: number[] = [];
    const stages: string[] = [];

    const result = await uploadFile(file, {
      purpose: "site",
      fetch: site.fetch,
      putPart,
      onProgress: ({ loaded }) => progress.push(loaded),
      onStage: (stage) => stages.push(stage),
    });

    expect(result.status).toBe("published");
    expect(Object.fromEntries(received)).toEqual({
      "https://s3/part-1": "0123",
      "https://s3/part-2": "4567",
      "https://s3/part-3": "89",
    });
    expect(progress.at(-1)).toBe(10);
    expect(stages).toEqual(["uploading", "finishing"]);
    expect(site.calls[0]).toEqual({
      method: "POST",
      path: "/api/storage/uploads",
      body: { purpose: "site", name: "a.bin", size: 10 },
    });
    // One batch of URLs covers all three parts.
    expect(
      site.calls.filter((call) => call.path.endsWith("/parts")),
    ).toHaveLength(1);
  });

  it("retries a failing part, with a fresh URL after a 403", async () => {
    const site = fakeSite(1, 10);
    const file = new File(["0123456789"], "a.bin");
    let tries = 0;
    const putPart: PartTransport = () => {
      tries++;
      // What xhrPut throws for an expired signature.
      if (tries === 1) return Promise.reject(new PartError(403));
      return Promise.resolve();
    };
    await uploadFile(file, {
      purpose: "site",
      fetch: site.fetch,
      putPart,
      sleep: noSleep,
    });
    expect(tries).toBe(2);
    expect(
      site.calls.filter((call) => call.path.endsWith("/parts")),
    ).toHaveLength(2);
  });

  it("gives up after too many failures and cancels the upload", async () => {
    const site = fakeSite(1, 10);
    const file = new File(["0123456789"], "a.bin");
    const putPart: PartTransport = () => Promise.reject(new Error("offline"));
    await expect(
      uploadFile(file, {
        purpose: "site",
        fetch: site.fetch,
        putPart,
        sleep: noSleep,
        attempts: 3,
      }),
    ).rejects.toBeInstanceOf(UploadError);
    expect(site.calls.at(-1)).toMatchObject({
      method: "DELETE",
      path: "/api/storage/uploads/abc123def456",
    });
  });

  it("passes the site's refusal on", async () => {
    const site = fakeSite(1, 10, { refuseStart: "That file is too big." });
    await expect(
      uploadFile(new File(["x"], "a.bin"), {
        purpose: "site",
        fetch: site.fetch,
      }),
    ).rejects.toThrow("That file is too big.");
  });

  it("stops when cancelled", async () => {
    const site = fakeSite(2, 5);
    const controller = new AbortController();
    const putPart: PartTransport = (_url, _body, _progress, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
        controller.abort();
      });
    await expect(
      uploadFile(new File(["0123456789"], "a.bin"), {
        purpose: "site",
        fetch: site.fetch,
        putPart,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(site.calls.some((call) => call.method === "DELETE")).toBe(true);
  });
});
