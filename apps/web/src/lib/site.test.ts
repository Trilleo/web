import { describe, expect, it } from "vitest";
import { SITE_NAME, formatTitle, isPrivatePath } from "./site";

describe("isPrivatePath", () => {
  it("covers the account pages", () => {
    for (const path of ["/admin", "/admin/", "/auth/github", "/sign-in/"]) {
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
