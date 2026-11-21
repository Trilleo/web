import { describe, expect, it } from "vitest";
import { readSources } from "../sources";
import { sourceFiles } from "../testing";
import {
  DEFAULT_SETTINGS,
  afterTax,
  alternatives,
  buyPrice,
  isPriceTable,
  sellPrice,
  buildGraph,
  chosenOf,
  craftsFor,
  cycleQuantities,
  EMPTY_COLLECTION,
  collectionFile,
  connectedLine,
  fusedOf,
  inventoryOf,
  isCollection,
  isPlannerSave,
  leftToMax,
  multiPlan,
  parseCollectionFile,
  readCollection,
  withShard,
  deckOf,
  effectiveRate,
  exclusivityScores,
  freelyUsableShards,
  fusionLines,
  inventoryPlan,
  modFormatsFor,
  neighbourhood,
  standardLines,
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
  type PlanNode,
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
    expect(result.fusionCost).toBeCloseTo(0.03);
    expect(result.hunt.get(at(g, "C4"))).toBe(15);
    expect(result.hunt.get(at(g, "U1"))).toBe(6);
    expect(result.cost).toBeCloseTo(15 / 216 + 6 / 60 + 0.03);
    expect(result.costPerShard).toBeCloseTo(result.cost / 6);
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
    expect(options.at(-1)?.costPerShard).toBe(Infinity);
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

describe("coin mode", () => {
  const table = {
    SHARD_PHANPYRE: { ask: 120, bid: 100, boughtWeek: 10, soldWeek: 10 },
    SHARD_SEA_ARCHER: { ask: 60, bid: 50, boughtWeek: 10, soldWeek: 10 },
    SHARD_CROCODILE: { ask: 1000, bid: 900, boughtWeek: 1, soldWeek: 1 },
    SHARD_GROVE: { ask: null, bid: 400, boughtWeek: 1, soldWeek: 1 },
  };
  const coins: CalcSettings = {
    ...DEFAULT_SETTINGS,
    mode: "coins",
    fusionCoins: 10,
  };

  it("prices shards from buy orders, or instantly, or by hand", () => {
    expect(buyPrice("SHARD_PHANPYRE", coins, table)).toBe(100);
    expect(
      buyPrice("SHARD_PHANPYRE", { ...coins, instantBuy: true }, table),
    ).toBe(120);
    expect(
      buyPrice(
        "SHARD_PHANPYRE",
        { ...coins, prices: { SHARD_PHANPYRE: 7 } },
        table,
      ),
    ).toBe(7);
    expect(buyPrice("SHARD_TIAMAT", coins, table)).toBeNull();
    expect(sellPrice(table.SHARD_GROVE, true)).toBe(400);
    expect(sellPrice(table.SHARD_GROVE, false)).toBeNull();
    expect(afterTax(1000, 1.25)).toBe(987.5);
  });

  it("buys or fuses, whichever costs fewer coins", () => {
    const g = buildGraph(deck, coins, table);
    expect(g.mode).toBe("coins");
    const grove = at(g, "C1");
    // Fusing (5 × 100 + 2 × 50 + 10 coins, for 2) beats buying at 400 each.
    const { plan: result } = plan(g, grove, 2, coins);
    expect(result.cost).toBe(5 * 100 + 2 * 50 + 10);
    expect(result.costPerShard).toBe(305);
    expect(result.fusionCost).toBe(10);
    // Shards without a price can't be bought; Tiamat needs Tiamat.
    expect(plan(g, at(g, "L6"), 1, coins).plan.cost).toBe(Infinity);
  });

  it("checks the new settings", () => {
    expect(isCalcSettings({ ...DEFAULT_SETTINGS, mode: "gold" })).toBe(false);
    expect(isCalcSettings({ ...DEFAULT_SETTINGS, tax: 2 })).toBe(false);
    expect(
      isCalcSettings({ ...DEFAULT_SETTINGS, prices: { SHARD_GROVE: -1 } }),
    ).toBe(false);
    expect(
      isCalcSettings({ ...DEFAULT_SETTINGS, tax: 1.125, mode: "coins" }),
    ).toBe(true);
    // A save from before coin mode still reads.
    const newer = new Set([
      "mode",
      "instantBuy",
      "fusionCoins",
      "prices",
      "tax",
    ]);
    const older = Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).filter(([key]) => !newer.has(key)),
    );
    expect(readSettings({ ...older, hunterFortune: 50 })).toEqual({
      ...DEFAULT_SETTINGS,
      hunterFortune: 50,
    });
    expect(isPriceTable(table)).toBe(true);
    expect(isPriceTable({ SHARD_X: { ask: "1" } })).toBe(false);
  });
});

describe("inventory mode", () => {
  const g = graph();
  const grove = at(g, "C1");
  const phanpyre = at(g, "C4");
  const bogged = at(g, "U1");
  const kinds = (node: PlanNode): string[] =>
    node.kind === "split"
      ? ["split", ...node.parts.flatMap(kinds)]
      : node.kind === "fuse"
        ? ["fuse", ...node.inputs.flatMap(kinds)]
        : [node.kind];

  it("matches the plain plan with nothing held", () => {
    const plain = plan(g, grove, 2, DEFAULT_SETTINGS).plan;
    const held = inventoryPlan(g, grove, 2, DEFAULT_SETTINGS, {
      inventory: new Map(),
    }).plan;
    expect(held.crafts).toBe(plain.crafts);
    expect([...held.hunt]).toEqual([...plain.hunt]);
    expect(held.cost).toBeCloseTo(plain.cost, 12);
    expect(held.used?.size).toBe(0);
  });

  it("uses held shards in place of hunting, wholly or in part", () => {
    const whole = inventoryPlan(g, grove, 2, DEFAULT_SETTINGS, {
      inventory: new Map([[phanpyre, 5]]),
    });
    expect(whole.plan.used?.get(phanpyre)).toBe(5);
    expect(whole.plan.hunt.has(phanpyre)).toBe(false);
    expect(whole.left.get(phanpyre)).toBe(0);
    expect(kinds(whole.plan.tree)).toEqual(["fuse", "owned", "hunt"]);

    const part = inventoryPlan(g, grove, 2, DEFAULT_SETTINGS, {
      inventory: new Map([[phanpyre, 3]]),
    });
    expect(part.plan.hunt.get(phanpyre)).toBe(2);
    expect(kinds(part.plan.tree)).toEqual([
      "fuse",
      "split",
      "owned",
      "hunt",
      "hunt",
    ]);
    expect(part.plan.cost).toBeLessThan(
      plan(g, grove, 2, DEFAULT_SETTINGS).plan.cost,
    );
  });

  it("takes the target itself when it's held, and never more than held", () => {
    const result = inventoryPlan(g, grove, 2, DEFAULT_SETTINGS, {
      inventory: new Map([
        [grove, 4],
        [bogged, 1],
      ]),
    });
    expect(result.plan.cost).toBe(0);
    expect(result.plan.tree.kind).toBe("owned");
    expect(result.left.get(grove)).toBe(2);
    expect(result.left.get(bogged)).toBe(1);
    expect(result.plan.produced).toBe(2);
  });

  it("keeps mod exports to the lists when shards are held", () => {
    const result = inventoryPlan(g, grove, 2, DEFAULT_SETTINGS, {
      inventory: new Map([[phanpyre, 5]]),
    });
    expect(modFormatsFor(result.plan)).toEqual(["nofrills", "skyhanni"]);
    expect(planText(g, result.plan)).toContain("Use 5 Phanpyre you have");
    const steps = fusionSteps(g, result.plan);
    expect(steps).toHaveLength(1);
  });

  it("scores inputs by how irreplaceable they are", () => {
    const solved = solve(g, DEFAULT_SETTINGS);
    const scores = exclusivityScores(g, solved.cost);
    // Phanpyre is in every Grove recipe; Bogged in only half.
    expect(scores[phanpyre]).toBeGreaterThan(0);
    expect(scores[bogged]).toBe(0);
    expect(Math.max(...scores)).toBeLessThanOrEqual(1);
  });
});

describe("fusion lines", () => {
  const g = graph();
  const grove = at(g, "C1");
  const phanpyre = at(g, "C4");
  const bogged = at(g, "U1");

  it("keeps the inputs most recipes share, by kind", () => {
    const lines = fusionLines(g);
    // Phanpyre is in both of Grove's (special) recipes; Grove in both of Bogged's.
    expect([...(lines.special.get(phanpyre) ?? [])]).toEqual([grove]);
    expect([...(lines.id.get(grove) ?? [])]).toEqual([bogged]);
    expect(lines.specialRev.get(grove)?.has(phanpyre)).toBe(true);
    // One recipe isn't enough to count (Tiamat from Crocodile).
    expect(lines.id.get(at(g, "R45"))).toBeUndefined();
    expect([...connectedLine(bogged, lines)].sort()).toEqual(
      [phanpyre, grove, bogged].sort(),
    );
    expect([...connectedLine(bogged, lines, "special")]).toEqual([bogged]);
  });

  it("drops edges from dearer shards to cheaper ones", () => {
    const solved = solve(g, DEFAULT_SETTINGS);
    const lines = standardLines(g, solved.cost);
    // Grove costs more than hunting Bogged, so nobody fuses one into the other.
    expect(lines.id.get(grove)).toBeUndefined();
    expect(lines.special.get(phanpyre)?.has(grove)).toBe(true);
  });

  it("shows a shard's neighbourhood, steps out each side", () => {
    const lines = fusionLines(g);
    const near = neighbourhood(grove, lines, 1);
    expect(near.depth.get(phanpyre)).toBe(-1);
    expect(near.depth.get(bogged)).toBe(1);
    expect(near.edges).toHaveLength(2);
    const edge = neighbourhood(phanpyre, lines, 1);
    expect(edge.depth.has(bogged)).toBe(false);
    expect(edge.more).toEqual({ before: false, after: true });
    expect(neighbourhood(phanpyre, lines, 2, "special").depth.has(bogged)).toBe(
      false,
    );
  });

  it("frees shards whose whole special line is maxed", () => {
    const solved = solve(g, DEFAULT_SETTINGS);
    expect(freelyUsableShards(g, new Map(), solved.cost).size).toBe(0);
    // Phanpyre leads to Grove: both must be maxed (96 common shards each).
    const onlyPhanpyre = freelyUsableShards(
      g,
      new Map([[phanpyre, 96]]),
      solved.cost,
    );
    expect(onlyPhanpyre.has(phanpyre)).toBe(false);
    const both = freelyUsableShards(
      g,
      new Map([
        [phanpyre, 96],
        [grove, 96],
      ]),
      solved.cost,
    );
    expect(both.has(phanpyre)).toBe(true);
    expect(both.has(grove)).toBe(true);
  });
});

describe("collection", () => {
  const g = graph();
  it("keeps only shards with something to say, and checks saves", () => {
    let c = withShard(EMPTY_COLLECTION, "SHARD_GROVE", { level: 3, held: 12 });
    c = withShard(c, "SHARD_PHANPYRE", { held: 5, keep: true });
    c = withShard(c, "SHARD_GROVE", { level: 0 });
    expect(c).toEqual({
      levels: {},
      held: { SHARD_GROVE: 12, SHARD_PHANPYRE: 5 },
      keep: ["SHARD_PHANPYRE"],
    });
    expect(isCollection(c)).toBe(true);
    expect(isSavedValue(c)).toBe(true);
    expect(isCollection({ ...c, levels: { SHARD_GROVE: 11 } })).toBe(false);
    expect(isCollection({ ...c, held: { grove: 1 } })).toBe(false);
    expect(readCollection("nonsense")).toEqual(EMPTY_COLLECTION);
  });

  it("turns into an inventory and fused counts, leaving kept shards out", () => {
    const c = withShard(
      withShard(EMPTY_COLLECTION, "SHARD_GROVE", { level: 2, held: 12 }),
      "SHARD_PHANPYRE",
      { held: 5, keep: true },
    );
    expect([...inventoryOf(g, c)]).toEqual([[at(g, "C1"), 12]]);
    // Common: 1 + 3 shards to level 2.
    expect([...fusedOf(g, c)]).toEqual([[at(g, "C1"), 4]]);
    expect(leftToMax("common", 2)).toBe(92);
    expect(leftToMax("legendary", 10)).toBe(0);
  });

  it("round-trips through a downloaded file", () => {
    const c = withShard(EMPTY_COLLECTION, "SHARD_TIAMAT", { level: 10 });
    const text = collectionFile(c, new Date("2026-11-21T00:00:00Z"));
    expect(parseCollectionFile(text)).toEqual(c);
    expect(readCollection(JSON.parse(text))).toEqual(c);
    expect(parseCollectionFile("{}")).toBeNull();
    expect(parseCollectionFile("not json")).toBeNull();
  });
});

describe("planner", () => {
  const g = graph();
  const grove = at(g, "C1");
  const bogged = at(g, "U1");

  it("adds up separate plans", () => {
    const targets = [
      { shard: grove, quantity: 2 },
      { shard: bogged, quantity: 3 },
    ];
    const result = multiPlan(g, targets, DEFAULT_SETTINGS);
    const one = plan(g, grove, 2, DEFAULT_SETTINGS).plan;
    const two = plan(g, bogged, 3, DEFAULT_SETTINGS).plan;
    expect(result.plans).toHaveLength(2);
    expect(result.cost).toBeCloseTo(one.cost + two.cost, 12);
    expect(result.crafts).toBe(one.crafts + two.crafts);
    expect(result.hunt.get(bogged)).toBe(
      (one.hunt.get(bogged) ?? 0) + (two.hunt.get(bogged) ?? 0),
    );
  });

  it("spends held shards across targets, never twice", () => {
    const result = multiPlan(
      g,
      [
        { shard: grove, quantity: 2 },
        { shard: grove, quantity: 2 },
      ],
      DEFAULT_SETTINGS,
      { inventory: new Map([[at(g, "C4"), 7]]) },
    );
    expect(result.used.get(at(g, "C4"))).toBe(7);
    expect(result.plans[0]?.used?.get(at(g, "C4"))).toBe(5);
    expect(result.plans[1]?.used?.get(at(g, "C4"))).toBe(2);
  });

  it("checks the planner's save", () => {
    const save = {
      targets: [{ shard: "SHARD_GROVE", quantity: 96 }],
      done: ["x"],
    };
    expect(isPlannerSave(save)).toBe(true);
    expect(isSavedValue(save)).toBe(true);
    expect(
      isPlannerSave({ ...save, targets: [...save.targets, ...save.targets] }),
    ).toBe(false);
    expect(
      isPlannerSave({
        ...save,
        targets: [{ shard: "SHARD_GROVE", quantity: 0 }],
      }),
    ).toBe(false);
  });
});
