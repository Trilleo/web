import { describe, expect, it } from "vitest";
import {
  INFO_PAGES,
  LEGAL_HUB,
  infoPage,
  infoPagesIn,
  infoPaths,
  lastUpdated,
} from "./info-pages";
import { securityTxt } from "./security-txt";
import { isPrivatePath } from "./site";

describe("INFO_PAGES", () => {
  it("has unique, public, slash-terminated addresses", () => {
    const paths = infoPaths();
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path).toMatch(/^\/[a-z/-]+\/$/);
      expect(isPrivatePath(path)).toBe(false);
    }
  });

  it("keeps legal pages under the legal hub", () => {
    for (const page of infoPagesIn("legal"))
      expect(page.path.startsWith(LEGAL_HUB.path)).toBe(true);
  });

  it("dates every page, newest change first", () => {
    for (const page of INFO_PAGES) {
      expect(page.changes.length).toBeGreaterThan(0);
      const dates = page.changes.map((change) => change.date);
      for (const date of dates) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect([...dates].sort().reverse()).toEqual(dates);
      expect(Number.isNaN(lastUpdated(page).getTime())).toBe(false);
    }
  });

  it("has descriptions long enough for search results, but not too long", () => {
    for (const page of INFO_PAGES) {
      expect(page.description.length).toBeGreaterThan(40);
      expect(page.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("finds pages by address, and refuses others", () => {
    expect(infoPage("/legal/privacy/").label).toBe("Privacy");
    expect(() => infoPage("/nope/")).toThrow();
  });
});

describe("securityTxt", () => {
  it("has a contact and an expiry within a year (RFC 9116)", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    const text = securityTxt(now);
    expect(text).toMatch(/^Contact: mailto:/m);
    const expires = /^Expires: (.+)$/m.exec(text)?.[1];
    expect(expires).toBeDefined();
    const at = new Date(expires ?? "");
    expect(at.getTime()).toBeGreaterThan(now.getTime());
    expect(at.getTime() - now.getTime()).toBeLessThanOrEqual(
      366 * 24 * 60 * 60 * 1000,
    );
    expect(text).toContain(
      "Canonical: https://www.trilleo.net/.well-known/security.txt",
    );
    expect(text.endsWith("\n")).toBe(true);
  });
});
