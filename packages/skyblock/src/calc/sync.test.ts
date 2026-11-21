import { describe, expect, it } from "vitest";
import { collectionProgress, applySync } from "./sync";
import type { Collection } from "./collection";

const start: Collection = {
  levels: { SHARD_GROVE: 3, SHARD_TIAMAT: 1 },
  held: { SHARD_GROVE: 5 },
  keep: ["SHARD_GROVE"],
};
const known = (id: string) => id !== "SHARD_NEW";

describe("applySync", () => {
  it("replaces each part it sends, and lists what changed", () => {
    const result = applySync(
      start,
      {
        mode: "replace",
        levels: [
          { id: "SHARD_GROVE", level: 4 },
          { id: "SHARD_NEW", level: 2 },
        ],
      },
      known,
    );
    expect(result.collection).toEqual({
      levels: { SHARD_GROVE: 4 },
      held: { SHARD_GROVE: 5 },
      keep: ["SHARD_GROVE"],
    });
    expect(result.levels).toEqual([
      { id: "SHARD_GROVE", from: 3, to: 4 },
      { id: "SHARD_TIAMAT", from: 1, to: 0 },
    ]);
    expect(result.held).toEqual([]);
    expect(result.unknownIds).toEqual(["SHARD_NEW"]);
  });

  it("merges only the shards listed, a 0 removing one, and clamps amounts", () => {
    const result = applySync(
      start,
      {
        mode: "merge",
        levels: [{ id: "SHARD_TIAMAT", level: 99 }],
        held: [
          { id: "SHARD_GROVE", count: 0 },
          { id: "SHARD_TIAMAT", count: 2.7 },
        ],
      },
      known,
    );
    expect(result.collection.levels).toEqual({
      SHARD_GROVE: 3,
      SHARD_TIAMAT: 10,
    });
    expect(result.collection.held).toEqual({ SHARD_TIAMAT: 2 });
    expect(result.held).toEqual([
      { id: "SHARD_GROVE", from: 5, to: 0 },
      { id: "SHARD_TIAMAT", from: 0, to: 2 },
    ]);
  });

  it("changes nothing for an empty sync", () => {
    const result = applySync(start, { mode: "replace" }, known);
    expect(result.collection).toEqual(start);
    expect(result.levels).toEqual([]);
  });
});

describe("collectionProgress", () => {
  it("counts maxed attributes, levels and shards left", () => {
    const progress = collectionProgress(
      [
        { id: "SHARD_GROVE", rarity: "common" },
        { id: "SHARD_TIAMAT", rarity: "legendary" },
      ],
      { levels: { SHARD_GROVE: 10, SHARD_TIAMAT: 1 }, held: {}, keep: [] },
    );
    expect(progress.maxed).toBe(1);
    expect(progress.levels).toBe(11);
    expect(progress.shards).toBe(2);
    expect(progress.leftToMax).toBeGreaterThan(0);
  });
});
