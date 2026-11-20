import { describe, expect, it } from "vitest";
import { readSources } from "../sources";
import { sourceFiles } from "../testing";
import {
  DEFAULT_SETTINGS,
  alternatives,
  buildGraph,
  chosenOf,
  craftsFor,
  cycleQuantities,
  deckOf,
  effectiveRate,
  findCycles,
  fusionSteps,
  isCalcSettings,
  isChecklist,
  isChosenRecipe,
  isSavedValue,
  kuudraRate,
  modPayload,
  plan,
  planText,
  readSettings,
  snapToInteger,
  solve,
  stepId,
  toOverrides,
  withChoice,
  type CalcSettings,
  type Graph,
} from ".";

const deck = deckOf(
  readSources(sourceFiles(), { minShards: 1 }),
  "v1",
  "c",
  (id) => (id === "SHARD_TIAMAT" ? "/tiamat.webp" : null),
);
const graph = (settings: CalcSettings = DEFAULT_SETTINGS) =>
  buildGraph(deck, settings);
const at = (g: Graph, key: string) =>
  g.shards.findIndex((shard) => shard.key === key);
const levels = (over: Partial<CalcSettings["levels"]>) => ({
  ...DEFAULT_SETTINGS.levels,
  ...over,
});

describe("settings", () => {
  it("accepts the defaults and refuses anything off", () => {
    expect(isCalcSettings(DEFAULT_SETTINGS)).toBe(true);
    expect(isCalcSettings({ ...DEFAULT_SETTINGS, hunterFortune: -1 })).toBe(
      false,
    );
    expect(
      isCalcSettings({ ...DEFAULT_SETTINGS, levels: levels({ newt: 11 }) }),
    ).toBe(false);
    expect(isCalcSettings({ ...DEFAULT_SETTINGS, rates: { grove: 5 } })).toBe(
      false,
    );
    expect(isCalcSettings({ ...DEFAULT_SETTINGS, extra: 1 })).toBe(false);
    expect(isCalcSettings({ ...DEFAULT_SETTINGS, kuudraTier: "t9" })).toBe(
      false,
    );
  });

  it("reads older or broken saves back as far as they go", () => {
    expect(readSettings({ hunterFortune: 120, levels: { newt: 4 } })).toEqual({
      ...DEFAULT_SETTINGS,
      hunterFortune: 120,
      levels: levels({ newt: 4 }),
    });
    expect(readSettings({ hunterFortune: "lots" })).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("checks chosen recipes and checklists", () => {
    const choice = {
      shard: "SHARD_GROVE",
      recipe: { inputs: ["SHARD_PHANPYRE", "SHARD_CROCODILE"], quantity: 2 },
    };
    expect(isChosenRecipe(choice)).toBe(true);
    expect(isChosenRecipe({ shard: "SHARD_GROVE", recipe: null })).toBe(true);
    expect(
      isChosenRecipe({ ...choice, recipe: { ...choice.recipe, quantity: 0 } }),
    ).toBe(false);
    expect(
      isChecklist({ shard: "SHARD_TIAMAT", quantity: 3, done: ["a"] }),
    ).toBe(true);
    expect(isSavedValue([choice])).toBe(true);
    expect(isSavedValue({ anything: true })).toBe(false);
    expect(isSavedValue(DEFAULT_SETTINGS)).toBe(true);
  });
});

describe("rates", () => {
  it("applies fortune, rarity pets, Frog and own rates", () => {
    const shard = deck.shards[at(graph(), "C4")];
    if (!shard) throw new Error("fixture");
    expect(effectiveRate(shard, DEFAULT_SETTINGS)).toBe(216);
    expect(
      effectiveRate(shard, { ...DEFAULT_SETTINGS, hunterFortune: 100 }),
    ).toBe(432);
    // Newt: +2 fortune a level for Common shards.
    expect(
      effectiveRate(shard, {
        ...DEFAULT_SETTINGS,
        levels: levels({ newt: 10 }),
      }),
    ).toBeCloseTo(259.2);
    expect(
      effectiveRate(shard, { ...DEFAULT_SETTINGS, frogBonus: true }),
    ).toBeCloseTo(237.6);
    expect(
      effectiveRate(shard, {
        ...DEFAULT_SETTINGS,
        rates: { SHARD_PHANPYRE: 10 },
      }),
    ).toBe(10);
  });

  it("works out Kraken's rate from Kuudra", () => {
    expect(kuudraRate("t5", null, null)).toBeCloseTo(1.5 * (3600 / 125));
    expect(kuudraRate("t1", 0, null)).toBeLessThan(1e-6);
    expect(kuudraRate("t1", 155_000, 35)).toBeCloseTo(3600 / (60 + 3600));
  });
});

describe("solve and plan", () => {
  it("hunts what's cheaper to hunt and fuses the rest", () => {
    const g = graph();
    const { cost, choice } = solve(g, DEFAULT_SETTINGS);
    // Grove can't be hunted (rate 0): 2 per fusion of 5 Phanpyre + 2 Bogged.
    const grove = at(g, "C1");
    expect(choice[grove]?.b).toBe(at(g, "U1"));
    expect(cost[grove]).toBeCloseTo((5 / 216 + 2 / 60) / 2);
    expect(choice[at(g, "C4")]).toBeNull();
  });

  it("plans quantities, fusions and hours", () => {
    const g = graph({ ...DEFAULT_SETTINGS, fusionSeconds: 36 });
    const { plan: result } = plan(g, at(g, "C1"), 5, {
      ...DEFAULT_SETTINGS,
      fusionSeconds: 36,
    });
    expect(result.crafts).toBe(3);
    expect(result.produced).toBe(6);
    expect(result.fusionHours).toBeCloseTo(0.03);
    expect(result.hunt.get(at(g, "C4"))).toBe(15);
    expect(result.hunt.get(at(g, "U1"))).toBe(6);
    expect(result.hours).toBeCloseTo(15 / 216 + 6 / 60 + 0.03);
    expect(result.hoursPerShard).toBeCloseTo(result.hours / 6);
    expect(planText(g, result)).toBe(
      [
        "5 Grove: 3 fusions",
        "  Fuse 5 Grove (3× 5 Phanpyre + 2 Bogged)",
        "    Hunt 15 Phanpyre",
        "    Hunt 6 Bogged",
      ].join("\n"),
    );
  });

  it("scales reptile fusions by Crocodile", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      levels: levels({ crocodile: 10 }),
      rates: { SHARD_PHANPYRE: 1 },
    };
    const g = graph(settings);
    const { plan: result } = plan(g, at(g, "C1"), 12, settings);
    // Phanpyre made dear: Grove from Phanpyre + Crocodile, a reptile fusion: 2 × 1.2.
    expect(result.tree.kind === "fuse" && result.tree.recipe.reptile).toBe(
      true,
    );
    expect(result.crafts).toBe(5);
    expect(result.produced).toBe(12);
  });

  it("follows recipes chosen by hand, and forgets ones the data lost", () => {
    const g = graph();
    const grove = at(g, "C1");
    const viaCroc = g.recipes[grove]?.find((r) => r.b === at(g, "R45"));
    if (!viaCroc) throw new Error("fixture");
    const saved = withChoice([], chosenOf(g, grove, viaCroc));
    const { overrides, stale } = toOverrides(g, [
      ...saved,
      { shard: "SHARD_GONE", recipe: null },
    ]);
    expect(stale).toEqual([{ shard: "SHARD_GONE", recipe: null }]);
    const { plan: result } = plan(g, grove, 2, DEFAULT_SETTINGS, overrides);
    expect(result.tree.kind === "fuse" && result.tree.recipe).toBe(viaCroc);
    // Hunting chosen for Bogged's own maker doesn't touch the rest.
    expect(
      toOverrides(g, [{ shard: "SHARD_GROVE", recipe: null }]).overrides.get(
        grove,
      ),
    ).toBeNull();
  });

  it("finds loops made by chosen recipes and plans whole laps", () => {
    const settings = { ...DEFAULT_SETTINGS, levels: levels({ crocodile: 10 }) };
    const g = graph(settings);
    const grove = at(g, "C1");
    const bogged = at(g, "U1");
    const groveFromBogged = g.recipes[grove]?.find((r) => r.b === bogged);
    const boggedFromGrove = g.recipes[bogged]?.find((r) => r.a === at(g, "C4"));
    if (!groveFromBogged || !boggedFromGrove) throw new Error("fixture");
    const overrides = new Map([
      [grove, groveFromBogged],
      [bogged, boggedFromGrove],
    ]);
    const solved = solve(g, settings, overrides);
    expect(findCycles(solved.choice).map((group) => [...group].sort())).toEqual(
      [[grove, bogged].sort()],
    );
    const { plan: result } = plan(g, grove, 10, settings, overrides);
    expect(result.tree.kind).toBe("cycle");
    if (result.tree.kind !== "cycle") return;
    expect(result.tree.crafts % result.tree.steps.length).toBe(0);
    const loop = cycleQuantities(g, grove, result.tree.steps, 10, 1);
    expect(loop?.crafts).toBeGreaterThan(0);
    expect(fusionSteps(g, result).at(-1)?.kind).toBe("loop");
  });
});

describe("helpers", () => {
  it("snaps float noise and counts fusions", () => {
    expect(snapToInteger(2 * 1.2 - 2)).toBeCloseTo(0.4);
    expect(snapToInteger(5 * 1.2 - 6)).toBe(0);
    expect(craftsFor(12, 1.2)).toBe(10);
    expect(craftsFor(13, 2)).toBe(7);
  });

  it("lists alternatives cheapest first, marking the current one", () => {
    const g = graph();
    const solved = solve(g, DEFAULT_SETTINGS);
    const options = alternatives(g, solved, DEFAULT_SETTINGS, at(g, "C1"));
    expect(options).toHaveLength(3);
    expect(options[0]?.current).toBe(true);
    expect(options.at(-1)?.recipe).toBeNull();
    expect(options.at(-1)?.hoursPerShard).toBe(Infinity);
  });

  it("gives fusions stable IDs, deepest first", () => {
    const g = graph();
    const { plan: result } = plan(g, at(g, "C1"), 4, DEFAULT_SETTINGS);
    const steps = fusionSteps(g, result);
    expect(steps.map((step) => step.id)).toEqual([
      "SHARD_GROVE=SHARD_PHANPYRE+SHARD_SEA_ARCHER*2",
    ]);
    const recipe = result.tree.kind === "fuse" ? result.tree.recipe : null;
    if (recipe) expect(stepId(g, at(g, "C1"), recipe)).toBe(steps[0]?.id);
  });

  it("writes the mods' formats", () => {
    const g = graph();
    const { plan: result } = plan(g, at(g, "C1"), 4, DEFAULT_SETTINGS);
    const ocean = modPayload(g, result, "skyocean");
    expect(ocean.prefix).toBe("<SkyOceanRecipe>(V2):");
    expect(JSON.parse(ocean.json)).toEqual({
      shard: "C1",
      method: "recipe",
      quantity: 4,
      craftsExpected: 2,
      outputQuantity: 2,
      pureReptile: 0,
      inputs: [
        { shard: "C4", method: "direct", quantity: 10 },
        { shard: "U1", method: "direct", quantity: 4 },
      ],
    });
    expect(JSON.parse(modPayload(g, result, "nofrills").json)).toEqual([
      { name: "Grove", needed: 4, source: "Fuse" },
      { name: "Phanpyre", needed: 10, source: "Direct" },
      { name: "Bogged", needed: 4, source: "Direct" },
    ]);
    expect(JSON.parse(modPayload(g, result, "skyhanni").json)).toEqual([
      { name: "Phanpyre", needed: 10 },
      { name: "Bogged", needed: 4 },
    ]);
  });

  it("puts icons and reptile families in the deck", () => {
    expect(deck.shards.find((s) => s.key === "L6")).toMatchObject({
      icon: "/tiamat.webp",
      reptile: true,
    });
    expect(deck.shards.find((s) => s.key === "C1")?.reptile).toBe(false);
  });
});
