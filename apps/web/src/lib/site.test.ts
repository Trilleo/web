import { describe, expect, it } from "vitest";
import { SITE_NAME, formatTitle, inSitemap, isPrivatePath } from "./site";

describe("isPrivatePath", () => {
  it("covers the account pages", () => {
    for (const path of [
      "/account",
      "/admin/",
      "/api/tools/notes/data",
      "/auth/github",
      "/comments",
      "/contact/send",
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
      "/contact/",
      "/legal/privacy/",
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

describe("inSitemap", () => {
  it("leaves out private pages and personal study pages", () => {
    expect(inSitemap("/study/")).toBe(true);
    expect(inSitemap("/study/circuits/ohms-law/")).toBe(true);
    expect(inSitemap("/study/review/")).toBe(false);
    expect(inSitemap("/study/mistakes/")).toBe(false);
    expect(inSitemap("/study/circuits/practice/")).toBe(false);
    expect(inSitemap("/admin/")).toBe(false);
  });
});
