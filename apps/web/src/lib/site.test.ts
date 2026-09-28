import { describe, expect, it } from "vitest";
import { SITE_NAME, formatTitle } from "./site";

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
