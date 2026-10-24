import { describe, expect, it } from "vitest";
import { FetchError, download, type DownloadLimits } from "./sources";

const URL_ = "https://sdvx.test/chunithm/01/obj/data00001mst.png";
const FILE = Uint8Array.from({ length: 10_000 }, (_, i) => i % 251);
const LIMITS: DownloadLimits = {
  maxBytes: 1_000_000,
  stallMs: 1000,
  totalMs: 10_000,
  tries: 6,
};

/**
 * A server like sdvx.in's: ranges with If-Range, an ETag, and a body that breaks
 * off after `cutAt` bytes on each connection (null: never).
 */
function server(options: {
  cutAt?: number | null;
  etag?: string | null;
  file?: () => Uint8Array;
}) {
  const sent: { range: string | null; ifRange: string | null }[] = [];
  const fetcher: typeof fetch = (_input, init) => {
    const headers = new Headers(init?.headers);
    const range = headers.get("range");
    const ifRange = headers.get("if-range");
    sent.push({ range, ifRange });
    const file = options.file?.() ?? FILE;
    const etag = options.etag === undefined ? '"v1"' : options.etag;
    const from =
      range && (!ifRange || ifRange === etag)
        ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? "0")
        : 0;
    const part = file.subarray(from);
    const cut = options.cutAt ?? null;
    let delivered = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (cut === null || part.length <= cut) {
          controller.enqueue(part.slice());
          controller.close();
        } else if (!delivered) {
          // What arrived before the connection dropped is read first.
          delivered = true;
          controller.enqueue(part.slice(0, cut));
        } else {
          controller.error(new TypeError("terminated"));
        }
      },
    });
    return Promise.resolve(
      new Response(body, {
        status: from > 0 ? 206 : 200,
        headers: {
          "content-length": String(part.length),
          ...(etag ? { etag } : {}),
        },
      }),
    );
  };
  return { fetcher, sent };
}

describe("download", () => {
  it("gets a whole file in one go", async () => {
    const { fetcher, sent } = server({});
    const file = await download(fetcher, URL_, "image/png", LIMITS);
    expect(file.status).toBe(200);
    expect(file.bytes).toEqual(FILE);
    expect(sent).toHaveLength(1);
  });

  it("resumes a body that breaks off where it stopped", async () => {
    const { fetcher, sent } = server({ cutAt: 3000 });
    const file = await download(fetcher, URL_, "image/png", LIMITS);
    expect(file.bytes).toEqual(FILE);
    expect(sent.map((request) => request.range)).toEqual([
      null,
      "bytes=3000-",
      "bytes=6000-",
      "bytes=9000-",
    ]);
    expect(sent[1]?.ifRange).toBe('"v1"');
  });

  it("starts over when the file changed between pieces", async () => {
    let version = 0;
    const { fetcher } = server({
      cutAt: 6000,
      etag: null,
      file: () => {
        version++;
        return version === 1 ? new Uint8Array(10_000).fill(9) : FILE;
      },
    });
    // No ETag: it can't tell versions apart, so it never joins pieces; a short
    // file the second time comes whole.
    const file = await download(fetcher, URL_, "image/png", {
      ...LIMITS,
      tries: 2,
    }).catch((error: unknown) => error);
    expect(file).toBeInstanceOf(FetchError);
  });

  it("says how far it got when it can't finish", async () => {
    const { fetcher } = server({ cutAt: 1024 });
    await expect(
      download(fetcher, URL_, "image/png", { ...LIMITS, tries: 2 }),
    ).rejects.toThrow(/broke off at 2 KB of 10 KB \(terminated\)/);
  });

  it("hands back other answers without a body", async () => {
    const fetcher: typeof fetch = () =>
      Promise.resolve(new Response("<html>", { status: 302 }));
    const file = await download(fetcher, URL_, "image/png", LIMITS);
    expect(file.status).toBe(302);
    expect(file.bytes).toHaveLength(0);
  });

  it("refuses a file over the limit", async () => {
    const { fetcher } = server({});
    await expect(
      download(fetcher, URL_, "image/png", { ...LIMITS, maxBytes: 100 }),
    ).rejects.toThrow(/too large/);
  });

  it("gives up on a connection that goes quiet, and resumes", async () => {
    let calls = 0;
    const fetcher: typeof fetch = (_input, init) => {
      calls++;
      const signal = init?.signal;
      const headers = new Headers(init?.headers);
      const from = Number(
        /bytes=(\d+)-/.exec(headers.get("range") ?? "")?.[1] ?? "0",
      );
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          if (calls === 1) {
            // Half the file, then silence until the stall timer gives up.
            controller.enqueue(FILE.slice(0, 5000));
            signal?.addEventListener("abort", () => {
              controller.error(signal.reason);
            });
          } else {
            controller.enqueue(FILE.slice(from));
            controller.close();
          }
        },
      });
      return Promise.resolve(
        new Response(body, {
          status: from > 0 ? 206 : 200,
          headers: {
            "content-length": String(FILE.length - from),
            etag: '"v1"',
          },
        }),
      );
    };
    const file = await download(fetcher, URL_, "image/png", {
      ...LIMITS,
      stallMs: 50,
    });
    expect(file.bytes).toEqual(FILE);
    expect(calls).toBe(2);
  });
});
