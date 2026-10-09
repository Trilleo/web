import { describe, expect, it } from "vitest";
import { isForbiddenCrossOrigin } from "./origin-check";

const ORIGIN = "https://www.trilleo.net";

function post(path: string, headers: Record<string, string>, method = "POST") {
  return {
    request: new Request(`${ORIGIN}${path}`, { method, headers }),
    url: new URL(`${ORIGIN}${path}`),
  };
}

describe("isForbiddenCrossOrigin", () => {
  it("lets same-origin form posts and safe methods through", () => {
    const same = post("/comments", {
      origin: ORIGIN,
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(isForbiddenCrossOrigin(same.request, same.url)).toBe(false);
    const get = post("/comments", { origin: "https://evil.test" }, "GET");
    expect(isForbiddenCrossOrigin(get.request, get.url)).toBe(false);
  });

  it("refuses cross-site and origin-less form posts, as Astro does", () => {
    const cases: Record<string, string>[] = [
      {
        origin: "https://evil.test",
        "content-type": "multipart/form-data; boundary=x",
      },
      { "content-type": "application/x-www-form-urlencoded" },
      { origin: "https://evil.test", "content-type": "text/plain" },
      // No content type at all: needs the origin.
      { origin: "https://evil.test" },
    ];
    for (const headers of cases) {
      const { request, url } = post("/account/delete", headers);
      expect(isForbiddenCrossOrigin(request, url)).toBe(true);
    }
    // JSON from elsewhere isn't a form: CORS preflight guards it instead.
    const json = post("/api/x", {
      origin: "https://evil.test",
      "content-type": "application/json",
    });
    expect(isForbiddenCrossOrigin(json.request, json.url)).toBe(false);
  });

  it("lets one-click unsubscribes in from mail providers", () => {
    const { request, url } = post("/mail/unsubscribe/abc/?topic=replies", {
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(isForbiddenCrossOrigin(request, url)).toBe(false);
    const elsewhere = post("/mail/other", {
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(isForbiddenCrossOrigin(elsewhere.request, elsewhere.url)).toBe(true);
  });
});
