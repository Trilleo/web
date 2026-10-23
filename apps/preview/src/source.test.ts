import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_PREVIEW_BYTES, resolveLink } from "./links";
import { FETCH_ENDPOINT, PreviewError, fetchLink } from "./source";
import { forgetRecent, readRecent, rememberLink, MAX_RECENT } from "./recent";
import { sanitizeHtml, stripRemoteUrls } from "./sanitize";

const link = (href: string) => resolveLink(new URL(href));

describe("fetchLink", () => {
  it("reads the file straight from the site when the browser may", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(
        new Response("hello", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
      ),
    );
    const progress = vi.fn();
    const result = await fetchLink(link("https://example.com/docs/a.txt"), {
      fetch,
      onProgress: progress,
    });
    expect(result.route).toBe("browser");
    expect(result.file.name).toBe("a.txt");
    expect(await result.file.text()).toBe("hello");
    expect(result.contentType).toBe("text/plain; charset=utf-8");
    expect(progress).toHaveBeenLastCalledWith(5, null);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/docs/a.txt",
      expect.objectContaining({ credentials: "omit", mode: "cors" }),
    );
  });

  it("falls back to the server when the browser is refused", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) =>
      input === FETCH_ENDPOINT
        ? Promise.resolve(
            new Response("%PDF-1.7", {
              headers: {
                "X-Preview-Url": "https://cdn.example.com/final.pdf",
                "X-Preview-Name": encodeURIComponent("Q3 report.pdf"),
                "X-Preview-Type": "application/pdf",
              },
            }),
          )
        : Promise.reject(new TypeError("Failed to fetch")),
    );
    const result = await fetchLink(link("https://example.com/r"), { fetch });
    expect(result).toMatchObject({
      route: "server",
      finalUrl: "https://cdn.example.com/final.pdf",
      contentType: "application/pdf",
    });
    expect(result.file.name).toBe("Q3 report.pdf");
    const [, init] = fetch.mock.calls[1] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ url: "https://example.com/r" }));
  });

  it("passes on the server's explanation when it can't fetch either", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) =>
      input === FETCH_ENDPOINT
        ? Promise.resolve(
            Response.json(
              { error: { code: "blocked-address", message: "Private." } },
              { status: 403 },
            ),
          )
        : Promise.reject(new TypeError("Failed to fetch")),
    );
    await expect(
      fetchLink(link("https://example.com/r"), { fetch }),
    ).rejects.toThrow("Private.");
  });

  it("doesn't retry through the server when the site answered with an error", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response("nope", { status: 404 })),
    );
    await expect(
      fetchLink(link("https://example.com/gone.pdf"), { fetch }),
    ).rejects.toThrow(/not found/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses files over the limit, by their length or as they arrive", async () => {
    const big = vi.fn(() =>
      Promise.resolve(
        new Response("x", {
          headers: { "Content-Length": String(MAX_PREVIEW_BYTES + 1) },
        }),
      ),
    );
    await expect(
      fetchLink(link("https://example.com/big.bin"), { fetch: big }),
    ).rejects.toBeInstanceOf(PreviewError);

    const chunk = new Uint8Array(MAX_PREVIEW_BYTES / 2 + 1);
    const stream = vi.fn(() =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(chunk);
              controller.enqueue(chunk);
              controller.close();
            },
          }),
        ),
      ),
    );
    await expect(
      fetchLink(link("https://example.com/stream.bin"), { fetch: stream }),
    ).rejects.toThrow(/bigger than/);
  });
});

describe("recent links", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps the newest few, each once", () => {
    for (let i = 0; i < MAX_RECENT + 2; i++)
      rememberLink({
        url: `https://e.com/${String(i)}`,
        name: `${String(i)}.pdf`,
      });
    rememberLink({ url: "https://e.com/3", name: "3.pdf" });
    const recent = readRecent();
    expect(recent).toHaveLength(MAX_RECENT);
    expect(recent[0]?.url).toBe("https://e.com/3");
    expect(
      recent.filter((item) => item.url === "https://e.com/3"),
    ).toHaveLength(1);
    forgetRecent();
    expect(readRecent()).toEqual([]);
  });

  it("ignores broken storage", () => {
    localStorage.setItem("trilleo:tool:preview:recent", "{not json");
    expect(readRecent()).toEqual([]);
  });
});

describe("sanitizeHtml", () => {
  const html = (input: string, styles = false) => {
    const { fragment, blockedImages } = sanitizeHtml(input, { styles });
    const div = document.createElement("div");
    div.append(fragment);
    return { html: div.innerHTML, blockedImages };
  };

  it("takes out scripts, handlers and javascript: links", () => {
    const out = html(
      '<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><iframe src="https://e.com"></iframe>',
    ).html;
    expect(out).not.toMatch(/script|onclick|javascript|iframe/);
  });

  it("opens web links in a new tab and keeps in-page ones", () => {
    const out = html('<a href="https://e.com">a</a><a href="#ch2">b</a>').html;
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('href="#ch2"');
  });

  it("keeps pictures inside the file and drops remote ones", () => {
    const out = html(
      '<img src="data:image/png;base64,AAAA" alt="a"><img src="https://tracker.example/p.gif" alt="b">',
    );
    expect(out.html).toContain("data:image/png");
    expect(out.html).not.toContain("tracker.example");
    expect(out.blockedImages).toBe(1);
  });

  it("strips remote addresses from styles", () => {
    expect(
      stripRemoteUrls(
        "@import url(https://e.com/a.css); p { background: url('https://e.com/x.png') } q { background: url(data:image/png;base64,AA) }",
      ),
    ).toBe(
      " p { background: none } q { background: url(data:image/png;base64,AA) }",
    );
    const out = html(
      '<style>p{background:url(https://e.com/x)}</style><p style="background:url(https://e.com/y)">x</p>',
      true,
    ).html;
    expect(out).not.toContain("e.com");
  });
});
