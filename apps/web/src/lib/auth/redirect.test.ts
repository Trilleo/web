import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, noStoreRedirect, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps paths on this site, with their query and fragment", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/writing/post/?a=1#top")).toBe(
      "/writing/post/?a=1#top",
    );
  });

  it.each([
    null,
    undefined,
    "",
    "admin",
    "https://evil.example/",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "javascript:alert(1)",
  ])("sends %j to the default instead", (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_NEXT);
  });
});

describe("noStoreRedirect", () => {
  it("redirects without letting anything cache the response", () => {
    const response = noStoreRedirect("/sign-in", 303);
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/sign-in");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
