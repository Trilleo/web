import { describe, expect, it } from "vitest";
import {
  DATA_PACK_FORMATS,
  RESOURCE_PACK_FORMATS,
  atLeast,
  matchVersions,
  mavenRule,
  packFormatRule,
  semverRule,
  versionOfData,
  type VersionRule,
} from "./versions";

const KNOWN = [
  "26.1",
  "1.21.5",
  "1.21.4",
  "1.21.3",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.4",
  "1.20.1",
  "1.20",
  "1.19.4",
];

const match = (rule: VersionRule | null) =>
  rule ? matchVersions(rule, KNOWN) : null;

describe("semverRule (Fabric, Quilt)", () => {
  it("reads exact versions, tildes, carets and x-ranges", () => {
    expect(match(semverRule("1.21.4"))).toEqual(["1.21.4"]);
    expect(match(semverRule("~1.21.3"))).toEqual([
      "1.21.5",
      "1.21.4",
      "1.21.3",
    ]);
    expect(match(semverRule("~1.21"))).toEqual([
      "1.21.5",
      "1.21.4",
      "1.21.3",
      "1.21.1",
      "1.21",
    ]);
    expect(match(semverRule("1.20.x"))).toEqual([
      "1.20.6",
      "1.20.4",
      "1.20.1",
      "1.20",
    ]);
    expect(match(semverRule("^1.21.4"))).toEqual(["1.21.5", "1.21.4"]);
    expect(match(semverRule("*"))).toEqual(KNOWN);
  });

  it("intersects comparators and unions alternatives", () => {
    expect(match(semverRule(">=1.20.4 <1.21"))).toEqual(["1.20.6", "1.20.4"]);
    expect(match(semverRule(">= 1.21.4"))).toEqual([
      "26.1",
      "1.21.5",
      "1.21.4",
    ]);
    expect(match(semverRule("1.19.4 || 1.21.1"))).toEqual(["1.21.1", "1.19.4"]);
    expect(match(semverRule(["1.20.1", "1.21"]))).toEqual(["1.21", "1.20.1"]);
    expect(match(semverRule("1.20 - 1.20.4"))).toEqual([
      "1.20.4",
      "1.20.1",
      "1.20",
    ]);
    // Pre-release suffixes count as their release.
    expect(match(semverRule(">=1.21.4-rc.1"))).toEqual([
      "26.1",
      "1.21.5",
      "1.21.4",
    ]);
  });

  it("gives up on nonsense", () => {
    expect(semverRule("banana")).toBeNull();
  });
});

describe("mavenRule (Forge, NeoForge)", () => {
  it("reads intervals", () => {
    expect(match(mavenRule("[1.20.1,1.21)"))).toEqual([
      "1.20.6",
      "1.20.4",
      "1.20.1",
    ]);
    expect(match(mavenRule("[1.21.1]"))).toEqual(["1.21.1"]);
    expect(match(mavenRule("[1.21.3,)"))).toEqual([
      "26.1",
      "1.21.5",
      "1.21.4",
      "1.21.3",
    ]);
    expect(match(mavenRule("(,1.20]"))).toEqual(["1.20", "1.19.4"]);
    expect(match(mavenRule("1.20.1"))).toEqual(["1.20.1"]);
  });
});

describe("other rules", () => {
  it("takes a minimum (plugins' api-version)", () => {
    expect(match(atLeast("1.21"))).toEqual([
      "26.1",
      "1.21.5",
      "1.21.4",
      "1.21.3",
      "1.21.1",
      "1.21",
    ]);
  });

  it("maps pack formats to versions", () => {
    expect(match(packFormatRule(RESOURCE_PACK_FORMATS, 34, 46))).toEqual([
      "1.21.4",
      "1.21.3",
      "1.21.1",
      "1.21",
    ]);
    expect(match(packFormatRule(DATA_PACK_FORMATS, 48))).toEqual([
      "1.21.1",
      "1.21",
    ]);
    expect(packFormatRule(RESOURCE_PACK_FORMATS, 999)).toBeNull();
  });

  it("names the release a data version belongs to", () => {
    expect(versionOfData(4189)).toBe("1.21.4");
    expect(versionOfData(3956)).toBe("1.21.1");
    expect(versionOfData(9999)).toBeNull();
  });
});
