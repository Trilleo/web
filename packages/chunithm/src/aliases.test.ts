import { describe, expect, it } from "vitest";
import { ALIAS_LIMITS, cleanAlias, parseAliasImport } from "./index";

describe("cleaning an alias", () => {
  it("tidies what was typed and keys it for matching", () => {
    expect(cleanAlias("  神谕  ")).toEqual({
      ok: true,
      alias: "神谕",
      key: "神谕",
    });
    expect(cleanAlias("Conquest\t Challenge")).toEqual({
      ok: true,
      alias: "Conquest Challenge",
      key: "conquestchallenge",
    });
  });

  it("refuses empty, long or letterless names", () => {
    expect(cleanAlias("   ")).toEqual({ ok: false, problem: "empty" });
    expect(cleanAlias("x".repeat(ALIAS_LIMITS.maxLength + 1))).toEqual({
      ok: false,
      problem: "too-long",
    });
    expect(cleanAlias("!!! ・・")).toEqual({
      ok: false,
      problem: "no-letters",
    });
  });
});

describe("importing aliases", () => {
  it("reads a JSON object of IDs and names", () => {
    expect(
      parseAliasImport('{"2710": ["神谕", "oracle"], "3062": "征服"}'),
    ).toEqual({
      entries: [
        { songId: 2710, alias: "神谕" },
        { songId: 2710, alias: "oracle" },
        { songId: 3062, alias: "征服" },
      ],
      problems: [],
    });
  });

  it("reads a JSON array, in either spelling", () => {
    expect(
      parseAliasImport(
        '[{"id": 2710, "aliases": ["神谕"]}, {"songId": "3062", "alias": "征服"}, {"aliases": ["x"]}]',
      ),
    ).toEqual({
      entries: [
        { songId: 2710, alias: "神谕" },
        { songId: 3062, alias: "征服" },
      ],
      problems: ["Item 3: no song ID."],
    });
  });

  it("reads tab-separated lines, and says which it couldn't", () => {
    expect(parseAliasImport("2710\t神谕\toracle\n\nabc\tx\n3062 征服")).toEqual(
      {
        entries: [
          { songId: 2710, alias: "神谕" },
          { songId: 2710, alias: "oracle" },
        ],
        problems: [
          "Line 3: no song ID.",
          "Line 4: no tab between the ID and a name.",
        ],
      },
    );
  });

  it("says when JSON is broken", () => {
    expect(parseAliasImport("{nope").problems).toEqual([
      "That isn't valid JSON.",
    ]);
  });
});
