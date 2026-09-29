import { describe, expect, it } from "vitest";
import { SITE_NAME, formatTitle, isPrivatePath, transitionName } from "./site";

describe("isPrivatePath", () => {
  it("covers the account pages", () => {
    for (const path of [
      "/account",
      "/admin/",
      "/api/tools/notes/data",
      "/auth/github",
      "/comments",
      "/sign-in/",
    ]) {
      expect(isPrivatePath(path)).toBe(true);
    }
  });

  it("leaves everything else public", () => {
    for (const path of [
      "/",
      "/writing/",
      "/writing/admin-notes/",
      "/authors/",
    ]) {
      expect(isPrivatePath(path)).toBe(false);
    }
  });
});

describe("formatTitle", () => {
  it("returns the site name when no page title is given", () => {
    expect(formatTitle()).toBe(SITE_NAME);
  });

  it("treats a blank page title as missing", () => {
    expect(formatTitle("   ")).toBe(SITE_NAME);
  });

  it("appends the site name to a page title", () => {
    expect(formatTitle(" Blog ")).toBe(`Blog · ${SITE_NAME}`);
  });
});

describe("transitionName", () => {
  it("prefixes a slug", () => {
    expect(transitionName("post", "hello-world")).toBe("post-hello-world");
  });

  it("turns anything outside a CSS identifier into dashes", () => {
    expect(transitionName("post", "Hello, World!  2026")).toBe(
      "post-hello-world-2026",
    );
    expect(transitionName("tool", "a.b/c")).toBe("tool-a-b-c");
  });

  it("keeps letters from other scripts", () => {
    expect(transitionName("post", "你好-world")).toBe("post-你好-world");
  });

  it("never returns a bare prefix", () => {
    expect(transitionName("post", "!!!")).toBe("post-item");
  });
});
