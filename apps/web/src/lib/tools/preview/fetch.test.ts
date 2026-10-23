import type { LookupAddress } from "node:dns";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PREVIEW_FETCH_LIMITS,
  PreviewLimits,
  allowedHosts,
  checkTarget,
  guardedLookup,
  isPublicAddress,
  previewFetch,
  readTarget,
} from "./fetch";

const NONE: ReadonlySet<string> = new Set();

describe("isPublicAddress", () => {
  it("refuses loopback, private, link-local and reserved ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "255.255.255.255",
      "198.18.0.1",
      "::1",
      "::",
      "fe80::1",
      "fd00::1",
      "fc00::1",
      "ff02::1",
      "::ffff:127.0.0.1",
      "::ffff:10.0.0.1",
      "64:ff9b::a00:1",
      "2002:7f00:1::1",
      "2001:db8::1",
      "fe80::1%eth0",
      "not an ip",
    ])
      expect(isPublicAddress(address), address).toBe(false);
  });

  it("allows the public internet", () => {
    for (const address of [
      "1.1.1.1",
      "93.184.216.34",
      "172.32.0.1",
      "2606:4700:4700::1111",
      "2a00:1450:4001:80b::200e",
    ])
      expect(isPublicAddress(address), address).toBe(true);
  });
});

describe("checkTarget", () => {
  it("takes http(s) on the usual ports", () => {
    expect(checkTarget("https://example.com/a.pdf", NONE)).toBeInstanceOf(URL);
    expect(checkTarget("http://example.com:80/a", NONE)).toBeInstanceOf(URL);
    expect(checkTarget("https://93.184.216.34/a", NONE)).toBeInstanceOf(URL);
  });

  it("refuses other schemes, ports, credentials and private names", () => {
    expect(checkTarget("file:///etc/passwd", NONE)).toBe("invalid-url");
    expect(checkTarget("gopher://example.com/", NONE)).toBe("invalid-url");
    expect(checkTarget("https://a:b@example.com/", NONE)).toBe("invalid-url");
    expect(checkTarget("nonsense", NONE)).toBe("invalid-url");
    expect(checkTarget("https://example.com:8443/", NONE)).toBe("blocked-port");
    expect(checkTarget("http://example.com:6379/", NONE)).toBe("blocked-port");
    for (const target of [
      "http://localhost/",
      "http://app.localhost/",
      "http://127.0.0.1/",
      "http://[::1]/",
      "http://169.254.169.254/latest/meta-data/",
      "http://postgres/",
      "http://printer.local/",
      "http://metadata.google.internal/",
      "http://2130706433/",
      "http://0x7f.1/",
    ])
      expect(checkTarget(target, NONE), target).toBe("blocked-address");
  });

  it("lets the hosts e2e names through", () => {
    const allowed = allowedHosts({ PREVIEW_ALLOW_HOSTS: "127.0.0.1:4331, " });
    expect([...allowed]).toEqual(["127.0.0.1:4331"]);
    expect(checkTarget("http://127.0.0.1:4331/a", allowed)).toBeInstanceOf(URL);
    expect(checkTarget("http://127.0.0.1:4332/a", allowed)).toBe(
      "blocked-port",
    );
    expect([...allowedHosts({})]).toEqual([]);
  });
});

/** A DNS lookup that answers from a table, for guardedLookup. */
function fakeResolve(table: Record<string, string[]>) {
  return ((
    hostname: string,
    _options: unknown,
    callback: (error: Error | null, addresses: LookupAddress[]) => void,
  ) => {
    const answers = table[hostname];
    if (!answers) {
      callback(
        Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }),
        [],
      );
      return;
    }
    callback(
      null,
      answers.map((address) => ({
        address,
        family: address.includes(":") ? 6 : 4,
      })),
    );
  }) as unknown as typeof import("node:dns").lookup;
}

describe("guardedLookup", () => {
  const lookup = guardedLookup(
    fakeResolve({
      "public.test": ["93.184.216.34", "2606:4700::1"],
      "rebind.test": ["93.184.216.34", "127.0.0.1"],
      "private.test": ["10.0.0.5"],
    }),
  );
  const run = (host: string, all: boolean) =>
    new Promise<{ error: NodeJS.ErrnoException | null; result: unknown }>(
      (resolve) => {
        lookup(host, { all }, (error, address) => {
          resolve({ error, result: address });
        });
      },
    );

  it("passes public answers on, one or all", async () => {
    expect((await run("public.test", false)).result).toBe("93.184.216.34");
    expect((await run("public.test", true)).result).toHaveLength(2);
  });

  it("refuses a name if any answer is private", async () => {
    expect((await run("rebind.test", true)).error?.code).toBe(
      "EPREVIEWBLOCKED",
    );
    expect((await run("private.test", false)).error?.code).toBe(
      "EPREVIEWBLOCKED",
    );
    expect((await run("missing.test", false)).error?.code).toBe("ENOTFOUND");
  });
});

describe("PreviewLimits", () => {
  it("counts fetches per visitor per hour", () => {
    const limits = new PreviewLimits();
    const key = PreviewLimits.key("203.0.113.7");
    const now = new Date("2026-10-23T10:00:00Z");
    for (let i = 0; i < PREVIEW_FETCH_LIMITS.perVisitorHourly; i++)
      expect(limits.take(key, now)).toBeNull();
    expect(limits.take(key, now)).toBe("rate-limited");
    expect(limits.take(PreviewLimits.key("203.0.113.8"), now)).toBeNull();
    expect(limits.take(key, new Date("2026-10-23T11:00:01Z"))).toBeNull();
  });

  it("stops everyone once the day's bytes are used, until the next UTC day", () => {
    const limits = new PreviewLimits();
    const day = new Date("2026-10-23T23:00:00Z");
    expect(limits.addBytes(PREVIEW_FETCH_LIMITS.dailyBytes, day)).toBe(true);
    expect(limits.addBytes(1, day)).toBe(false);
    expect(limits.take("a", day)).toBe("busy");
    expect(limits.take("a", new Date("2026-10-24T00:00:01Z"))).toBeNull();
  });

  it("keeps only a hash of the address", () => {
    expect(PreviewLimits.key("203.0.113.7")).not.toContain("203");
  });
});

it("reads the target from a JSON body", async () => {
  const post = (body: string) =>
    readTarget(new Request("http://x/", { method: "POST", body }));
  expect(await post('{"url":"https://e.com/a"}')).toBe("https://e.com/a");
  expect(await post('{"url":5}')).toBeNull();
  expect(await post("not json")).toBeNull();
});

describe("previewFetch", () => {
  let server: Server;
  let origin = "";
  let allowed: ReadonlySet<string> = NONE;
  const big = Buffer.alloc(1024, 120);

  beforeAll(async () => {
    server = createServer((request, response) => {
      const path = request.url ?? "/";
      if (path === "/doc.pdf") {
        response.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="Q3 report.pdf"',
          "Content-Length": "8",
        });
        response.end("%PDF-1.7");
      } else if (path === "/page.html") {
        response.writeHead(200, { "Content-Type": "text/html" });
        response.end("<script>alert(1)</script>");
      } else if (path === "/gz") {
        response.writeHead(200, { "Content-Encoding": "gzip" });
        response.end(gzipSync("unpacked text"));
      } else if (path === "/redirect") {
        response.writeHead(302, { Location: "/doc.pdf" });
        response.end();
      } else if (path === "/to-private") {
        response.writeHead(302, { Location: "http://10.0.0.1/secret" });
        response.end();
      } else if (path === "/loop") {
        response.writeHead(302, { Location: "/loop" });
        response.end();
      } else if (path === "/huge") {
        response.writeHead(200, {
          "Content-Length": String(PREVIEW_FETCH_LIMITS.maxBytes + 1),
        });
        response.end();
      } else if (path === "/stream") {
        response.writeHead(200);
        response.end(big);
      } else {
        response.writeHead(404);
        response.end("missing");
      }
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const { port } = server.address() as AddressInfo;
    origin = `http://127.0.0.1:${String(port)}`;
    allowed = new Set([`127.0.0.1:${String(port)}`]);
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const fetchOne = (path: string, limits = new PreviewLimits()) =>
    previewFetch(path.startsWith("http") ? path : `${origin}${path}`, {
      limits,
      ip: "203.0.113.1",
      allowed,
    });

  const errorOf = async (response: Response) =>
    ((await response.json()) as { error: { code: string; message: string } })
      .error;

  it("streams the file back as a download that can't run here", async () => {
    const response = await fetchOne("/doc.pdf");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("%PDF-1.7");
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "content-type": "application/octet-stream",
      "content-disposition": "attachment",
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox; default-src 'none'",
      "cache-control": "private, no-store",
      "x-preview-type": "application/pdf",
      "x-preview-name": encodeURIComponent("Q3 report.pdf"),
      "x-preview-url": `${origin}/doc.pdf`,
    });
  });

  it("never serves a fetched page as a page", async () => {
    const response = await fetchOne("/page.html");
    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream",
    );
    expect(response.headers.get("x-preview-type")).toBe("text/html");
  });

  it("unpacks compressed answers", async () => {
    expect(await (await fetchOne("/gz")).text()).toBe("unpacked text");
  });

  it("follows redirects, checking each address", async () => {
    const response = await fetchOne("/redirect");
    expect(response.headers.get("x-preview-url")).toBe(`${origin}/doc.pdf`);
    const toPrivate = await fetchOne("/to-private");
    expect(toPrivate.status).toBe(403);
    expect((await errorOf(toPrivate)).code).toBe("blocked-address");
    expect((await errorOf(await fetchOne("/loop"))).code).toBe(
      "too-many-redirects",
    );
  });

  it("explains the site's errors and refuses files over the limit", async () => {
    const missing = await fetchOne("/nothing");
    expect(missing.status).toBe(502);
    expect((await errorOf(missing)).message).toMatch(/not found/);
    const huge = await fetchOne("/huge");
    expect(huge.status).toBe(413);
  });

  it("refuses private addresses before connecting, and counts visits", async () => {
    expect((await errorOf(await fetchOne("http://127.0.0.1/"))).code).toBe(
      "blocked-address",
    );
    const resolved = await previewFetch("http://rebind.test/", {
      limits: new PreviewLimits(),
      ip: "203.0.113.1",
      allowed: NONE,
      resolve: fakeResolve({ "rebind.test": ["127.0.0.1"] }),
    });
    expect((await errorOf(resolved)).code).toBe("blocked-address");
    const unreachable = await previewFetch("http://gone.test/", {
      limits: new PreviewLimits(),
      ip: "203.0.113.1",
      allowed: NONE,
      resolve: fakeResolve({}),
    });
    expect((await errorOf(unreachable)).code).toBe("unreachable");

    const limits = new PreviewLimits();
    for (let i = 0; i < PREVIEW_FETCH_LIMITS.perVisitorHourly; i++)
      await (await fetchOne("/stream", limits)).arrayBuffer();
    const refused = await fetchOne("/stream", limits);
    expect(refused.status).toBe(429);
  });
});
