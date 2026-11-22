import { describe, expect, it } from "vitest";
import {
  DataError,
  ShardCatalog,
  groupPairs,
  levelFromShards,
  pairCount,
  readSources,
  recipesOf,
  ruleParts,
  ruleText,
  searchShards,
  compareShardIds,
  parseShardId,
  segmentsHtml,
  segmentsText,
  shardSlug,
  shardsToLevel,
  shardsToMax,
  summarize,
  withoutBuffedBy,
  parseSegments,
  filterOptions,
  type Segment,
} from ".";
import { sourceFiles } from "./testing";

const read = () => readSources(sourceFiles(), { minShards: 1 });

describe("readSources", () => {
  it("reads every shard with its facts, in SkyShards' order", () => {
    const data = read();
    expect(data.shards.map((s) => s.key)).toEqual([
      "C1",
      "C4",
      "U1",
      "R45",
      "L6",
    ]);
    const grove = data.shards[0];
    expect(grove).toMatchObject({
      id: "SHARD_GROVE",
      slug: "grove",
      rarity: "common",
      category: "Forest",
      families: ["Elemental"],
      skill: "Global",
      fuseAmount: 2,
      inputs: ["Common&Forest", "Uncommon+"],
      idResult: "Phanpyre",
      rate: 0,
    });
    expect(grove?.attribute?.title).toBe("Nature Elemental");
    expect(data.shards[2]?.attribute).toBeNull();
    expect(data.shards[2]?.inputs).toBeNull();
  });

  it("keeps recipes compactly and gives them back by key", () => {
    const data = read();
    expect(pairCount(data)).toBe(5);
    expect([...recipesOf(data)]).toContainEqual({
      output: "C1",
      quantity: 2,
      inputs: ["C4", "R45"],
    });
  });

  it("refuses broken files with every problem listed", () => {
    const files = sourceFiles();
    const shards = (
      files.fusionData as { shards: Record<string, Record<string, unknown>> }
    ).shards;
    shards.C1 = { ...shards.C1, rarity: "mythic" };
    shards.C4 = { ...shards.C4, internal_id: "grove" };
    try {
      readSources(files, { minShards: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DataError);
      expect((error as DataError).problems).toEqual([
        'shard C1: rarity "mythic"',
        'shard C4: Hypixel ID "grove"',
      ]);
    }
  });

  it("refuses a list that's too short", () => {
    expect(() => readSources(sourceFiles())).toThrow(/only 5 shards/);
    expect(readSources(sourceFiles({ extra: 100 })).shards).toHaveLength(105);
  });

  it("refuses two shards with the same address", () => {
    const files = sourceFiles();
    const shards = (
      files.fusionData as { shards: Record<string, Record<string, unknown>> }
    ).shards;
    shards.C4 = { ...shards.C4, name: "GROVE" };
    expect(() => readSources(files, { minShards: 1 })).toThrow(
      /same address as C1/,
    );
  });
});

describe("shardSlug", () => {
  it("makes addresses from names", () => {
    expect(shardSlug("Lizard King")).toBe("lizard-king");
    expect(shardSlug("Soul of the Alpha")).toBe("soul-of-the-alpha");
    expect(shardSlug("Kiara's Fëlix!")).toBe("kiara-s-felix");
    expect(shardSlug("  --Tiamat--  ")).toBe("tiamat");
  });

  it("stays fast on long runs of separators", () => {
    const start = performance.now();
    expect(shardSlug(`a${"-".repeat(100_000)}!`)).toBe("a");
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe("attribute levels", () => {
  it("counts shards per level by rarity", () => {
    expect(shardsToMax("common")).toBe(96);
    expect(shardsToMax("legendary")).toBe(24);
    expect(shardsToLevel("rare", 3)).toBe(6);
    expect(levelFromShards("rare", 5)).toBe(2);
    expect(levelFromShards("rare", 6)).toBe(3);
    expect(levelFromShards("epic", 999)).toBe(10);
  });
});

describe("text", () => {
  const description = read().shards[0]?.attribute?.description ?? [];

  it("reads only known shapes", () => {
    expect(
      parseSegments([
        { t: "a", c: "nope", evil: 1 },
        { range: ["x", 2] },
        5,
        { range: [null, 3], unit: "%", c: "red" },
      ]),
    ).toEqual([{ t: "a" }, { range: [null, 3], unit: "%", c: "red" }]);
  });

  it("flattens to words without stat symbols", () => {
    expect(segmentsText(description)).toBe("Grants 2→20 Health.");
  });

  it("draws colours, ranges and symbols, escaping text", () => {
    const html = segmentsHtml(description);
    expect(html).toContain('<span class="mc-c-7">Grants </span>');
    expect(html).toContain('<span class="mc-c-c">2→20</span>');
    expect(html).toMatch(
      /<svg class="sb-glyph" aria-hidden="true" viewBox="0 0 7 7"/,
    );
    const hostile: Segment[] = [{ t: '<img src=x onerror="1">', bold: true }];
    expect(segmentsHtml(hostile)).toBe(
      '<span class="mc-c-7 mc-bold">&lt;img src=x onerror=&quot;1&quot;&gt;</span>',
    );
  });

  it("drops the Buffed-by tag", () => {
    expect(
      withoutBuffedBy([
        { t: "Grants 1." },
        { t: " " },
        { t: "Buffed by Foo attribute." },
      ]),
    ).toEqual([{ t: "Grants 1." }]);
  });
});

describe("rules", () => {
  it("puts fusion rules in words", () => {
    expect(ruleText("Common&Forest")).toBe("a Common Forest shard");
    expect(ruleText("Uncommon+")).toBe("an Uncommon or rarer shard");
    expect(ruleText("Rare+&Shulker")).toBe("a Rare or rarer Shulker shard");
    expect(ruleText("Legendary+&Combat")).toBe("a Legendary Combat shard");
    expect(ruleText("Epic+&Elemental")).toBe(
      "an Epic or rarer Elemental shard",
    );
    expect(ruleText("Cocoaleech Shard|Crime")).toBe(
      "Cocoaleech or a Crime shard",
    );
    expect(ruleText("Eel Shard|Firefly Shard|Firefox Shard")).toBe(
      "Eel, Firefly or Firefox",
    );
    expect(ruleParts("Phanpyre Shard|Phanflare Shard")).toEqual([
      { kind: "shard", name: "Phanpyre" },
      { kind: "shard", name: "Phanflare" },
    ]);
    expect(ruleParts("")).toEqual([]);
  });
});

describe("ShardCatalog", () => {
  const catalog = new ShardCatalog(read());

  it("finds shards by key, address and name", () => {
    expect(catalog.bySlugOf("tiamat")?.key).toBe("L6");
    expect(catalog.named("crocodile shard")?.key).toBe("R45");
    expect(catalog.get("nope")).toBeUndefined();
  });

  it("groups what makes a shard", () => {
    expect(catalog.madeFrom("C1")).toEqual([
      {
        quantity: 2,
        pairs: 2,
        groups: [{ with: "C4", others: ["U1", "R45"] }],
      },
    ]);
    expect(catalog.pairsMaking("U1")).toBe(2);
  });

  it("lists what a shard fuses into, rarest first", () => {
    expect(catalog.usedIn("C1")).toEqual([
      { output: "U1", quantity: 1, partners: ["C4", "C1"] },
    ]);
    expect(catalog.usedIn("R45").map((u) => u.output)).toEqual(["L6", "C1"]);
  });

  it("groups pairs by their most shared shard", () => {
    expect(
      groupPairs([
        ["A", "B"],
        ["A", "C"],
        ["D", "B"],
        ["E", "F"],
      ]),
    ).toEqual([
      { with: "A", others: ["B", "C"] },
      // A tie (each in one pair): the first one seen.
      { with: "D", others: ["B"] },
      { with: "E", others: ["F"] },
    ]);
  });
});

describe("shard IDs", () => {
  it("orders by rarity letter, then number", () => {
    expect(
      ["L1", "C10", "U2", "C9", "R1", "E3", "C1", "odd"].sort(compareShardIds),
    ).toEqual(["C1", "C9", "C10", "U2", "R1", "E3", "L1", "odd"]);
  });

  it("parses only real IDs", () => {
    expect(parseShardId("c14")).toEqual({ letter: 0, number: 14 });
    expect(parseShardId("X1")).toBeNull();
    expect(parseShardId("C")).toBeNull();
    expect(parseShardId("Grove")).toBeNull();
  });
});

describe("search", () => {
  const list = read().shards.map((shard) => summarize(shard, null));

  it("ranks names over attributes over text", () => {
    expect(searchShards(list, { query: "grove" }).map((s) => s.key)).toEqual([
      "C1",
    ]);
    expect(searchShards(list, { query: "pure reptile" })[0]?.key).toBe("R45");
    expect(searchShards(list, { query: "health" }).map((s) => s.key)).toEqual([
      "C1",
    ]);
    expect(searchShards(list, { query: "kiara" }).map((s) => s.key)).toEqual([
      "R45",
    ]);
    expect(searchShards(list, { query: "reptile" }).map((s) => s.key)).toEqual([
      "R45",
      "L6",
    ]);
  });

  it("finds a shard by its ID first", () => {
    expect(searchShards(list, { query: "r45" })[0]?.key).toBe("R45");
    expect(searchShards(list, { query: " L6 " })[0]?.key).toBe("L6");
  });

  it("filters, sorting by shard ID", () => {
    expect(
      searchShards(list, { category: "Combat" }).map((s) => s.key),
    ).toEqual(["R45", "L6"]);
    expect(searchShards(list, { rarity: "common" }).map((s) => s.key)).toEqual([
      "C1",
      "C4",
    ]);
    expect(
      searchShards(list, { family: "Croco", skill: "Hunting" }),
    ).toHaveLength(2);
    expect(filterOptions(list).categories).toEqual([
      "Combat",
      "Forest",
      "Water",
    ]);
  });
});
