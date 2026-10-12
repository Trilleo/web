import { describe, expect, it } from "vitest";
import {
  computeCalculator,
  parseCalculator,
  parseCosts,
  sumCosts,
} from "./calculators";
import {
  FormulaError,
  evaluateFormula,
  formatNumber,
  parseFormula,
} from "./formula";
import {
  bookFor,
  computeMaterials,
  demoRecipeLookup,
  parseRecipe,
  parseRecipeHeader,
  type RecipeData,
} from "./minecraft/recipes";
import { render } from "./test-render";

function recipeOf(argument: string, body: string): RecipeData {
  const { recipe } = parseRecipe(argument, body);
  if (!recipe) throw new Error(`Not a recipe: ${body}`);
  return recipe;
}

const value = (source: string, names: Record<string, number> = {}) =>
  evaluateFormula(parseFormula(source), new Map(Object.entries(names)));

describe("formulas", () => {
  it("follow arithmetic's order, with brackets, powers and functions", () => {
    expect(value("1 + 2 * 3")).toBe(7);
    expect(value("(1 + 2) * 3")).toBe(9);
    expect(value("2 ^ 3 ^ 2")).toBe(512);
    expect(value("-2 ^ 2")).toBe(4);
    expect(value("10 % 4 + 7 / 2")).toBe(5.5);
    expect(value("max(1, a, 3) + round(2.345, 2)", { a: 5 })).toBe(7.35);
    expect(value("clamp(150, 0, 100) × 2 − 1")).toBe(199);
  });

  it("give NaN for what can't be worked out, and refuse what isn't arithmetic", () => {
    expect(value("1 / 0")).toBeNaN();
    expect(value("missing + 1")).toBeNaN();
    expect(formatNumber(NaN)).toBe("—");
    expect(formatNumber(1234.5678)).toBe("1,234.57");
    for (const bad of [
      "alert(1)",
      "1 +",
      "(1",
      "1 2",
      "a.b",
      "x = 1",
      "constructor()",
    ])
      expect(() => parseFormula(bad), bad).toThrow(FormulaError);
  });
});

describe("calculators", () => {
  it("read inputs and results, in order", () => {
    const { spec, problems } = parseCalculator(
      "input base: Base = 100\ninput str: Strength (+%) = 50\nresult hit: Hit = base * (1 + str / 100)\nresult double: Twice = hit * 2",
    );
    expect(problems).toEqual([]);
    expect(spec.inputs.map((input) => input.label)).toEqual([
      "Base",
      "Strength (+%)",
    ]);
    const values = computeCalculator(spec, new Map([["str", 100]]));
    expect(values.get("hit")).toBe(200);
    expect(values.get("double")).toBe(400);
  });

  it("say what's wrong", () => {
    const { problems } = parseCalculator(
      "input a: A = x\nresult b: B = c + 1\nresult d: D = (\nnonsense\nresult e: E = 1\nresult e: E = 2",
    );
    expect(problems).toHaveLength(5);
  });
});

describe("cost tables", () => {
  it("add up the rows between two levels", () => {
    const { spec, problems } = parseCosts(
      "columns: Coins, Wheat\nI: 0, 80\nII: 1 000, 160\nIII: 5_000, 320",
    );
    expect(problems).toEqual([]);
    expect(sumCosts(spec, -1, 2)).toEqual([6000, 560]);
    expect(sumCosts(spec, 0, 1)).toEqual([1000, 160]);
    expect(sumCosts(spec, 2, 2)).toEqual([0, 0]);
    expect(parseCosts("I: 1,000").problems).toHaveLength(2);
  });
});

describe("recipes", () => {
  it("read stations, grids and times", () => {
    expect(parseRecipeHeader("Forge 2x1, 4h")).toEqual({
      station: "Forge",
      columns: 2,
      rows: 1,
      time: "4h",
    });
    expect(parseRecipeHeader("furnace")).toEqual({
      station: "furnace",
      columns: 1,
      rows: 1,
      time: null,
    });
    expect(parseRecipeHeader("")).toMatchObject({
      station: "Crafting Table",
      columns: 3,
      rows: 3,
    });
  });

  it("trim what's typed around names, counts and sizes", () => {
    expect(parseRecipeHeader("  Forge   2 x 1  ,  4h ")).toEqual({
      station: "Forge",
      columns: 2,
      rows: 1,
      time: "4h",
    });
    const recipe = recipeOf(
      "Crafting Table",
      "row 1:   A  x 2 ,  B\n2 - 3 :  C\nmakes:   E x4 \ntime:  5s",
    );
    expect(recipe.slots.slice(0, 3).map((slot) => slot?.name)).toEqual([
      "A",
      "C",
      "C",
    ]);
    expect(recipe.slots[0]?.count).toBe(2);
    expect(recipe.output).toEqual({ name: "E", count: 4 });
    expect(recipe.time).toBe("5s");
    const list = recipeOf("Forge", "-   D  ×3\n*  F\nmakes: G");
    expect(list.slots).toEqual([
      { name: "D", count: 3 },
      { name: "F", count: 1 },
    ]);
  });

  it("stay fast on long runs of spaces", () => {
    // Recipes and calculators are typed by anyone who can edit a page.
    const spaces = " ".repeat(50_000);
    const started = performance.now();
    parseRecipeHeader(`Forge${spaces}2`);
    parseRecipe(
      "Crafting Table 3x3",
      [
        `makes:${spaces}x`,
        `time:${spaces}`,
        `* ${spaces}x`,
        `row 1:${spaces}x`,
        `9:${spaces}x`,
        `A${spaces}x${spaces}`,
      ].join("\n"),
    );
    parseCalculator(`input _:${spaces}x`);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("read slots, rows, ranges and lists", () => {
    const grid = parseRecipe(
      "Crafting Table",
      "row 1: A, B\n9: C x2\nmakes: D x4",
    );
    expect(grid.problems).toEqual([]);
    expect(grid.recipe?.slots.map((slot) => slot?.name ?? null)).toEqual([
      "A",
      "B",
      null,
      null,
      null,
      null,
      null,
      null,
      "C",
    ]);
    expect(grid.recipe?.output).toEqual({ name: "D", count: 4 });
    const list = parseRecipe("Alchemy, 30 s", "- A x2\n- B\nmakes: C");
    expect(list.recipe).toMatchObject({
      columns: 0,
      time: "30 s",
      slots: [
        { name: "A", count: 2 },
        { name: "B", count: 1 },
      ],
    });
    expect(parseRecipe("Crafting Table", "1: A").problems).toContain(
      "Say what it makes: `makes: Item x1`.",
    );
    expect(
      parseRecipe("Crafting Table", "10: A\nmakes: B").problems[0],
    ).toContain("outside");
    expect(parseRecipe("Station", "row 1: A\nmakes: B").problems[0]).toContain(
      "grid size",
    );
  });
});

describe("raw materials", () => {
  const book = {
    "aspect of the end": recipeOf(
      "",
      "2: Enchanted Diamond\n5: Enchanted Diamond\n8: Stick\nmakes: Aspect of the End",
    ),
    "enchanted diamond": recipeOf(
      "",
      "- Diamond x160\nmakes: Enchanted Diamond",
    ),
    stick: recipeOf("", "- Oak Planks x2\nmakes: Stick x4"),
  };

  it("follow recipes down, rounding up to whole crafts", () => {
    const { tree, raw } = computeMaterials(book, "Aspect of the End", 3);
    expect(tree.crafts).toBe(3);
    expect(
      Object.fromEntries([...raw].map(([key, i]) => [key, i.count])),
    ).toEqual({ diamond: 960, "oak planks": 2 });
    const stick = tree.children.find((child) => child.key === "stick");
    expect(stick).toMatchObject({ count: 3, crafts: 1, makes: 4 });
  });

  it("use what's on hand first", () => {
    const { raw } = computeMaterials(
      book,
      "Aspect of the End",
      1,
      new Map([["enchanted diamond", 1]]),
    );
    expect(raw.get("diamond")?.count).toBe(160);
  });

  it("stop at loops, and collect only the recipes an item needs", () => {
    const loop = {
      a: recipeOf("", "- B\nmakes: A"),
      b: recipeOf("", "- A\nmakes: B"),
    };
    const { tree } = computeMaterials(loop, "A", 1);
    expect(tree.children[0]?.children[0]).toMatchObject({
      key: "a",
      loop: true,
    });
    expect(
      Object.keys(bookFor(demoRecipeLookup, "Aspect of the End")).sort(),
    ).toEqual(["aspect of the end", "enchanted diamond"]);
  });
});

describe("the components", () => {
  it("::: recipe draws the station's grid and output, and hands the recipe back", () => {
    const { html, env } = render(
      "::: recipe Forge, 4h\n- Enchanted Diamond x32\nmakes: Aspect of the End\n:::",
    );
    expect(html).toContain(
      '<figcaption class="mc-recipe-title">Forge<span class="mc-recipe-time">4h</span></figcaption>',
    );
    expect(html).toContain('aria-label="Enchanted Diamond, 32"');
    expect(html).toContain('role="group" aria-label="Makes"');
    const emitted = env.components?.emitted?.get("recipe") as {
      output: { name: string };
      html: string;
    }[];
    expect(emitted[0]?.output.name).toBe("Aspect of the End");
    expect(emitted[0]?.html).toBe(html);
  });

  it("::: materials shows the tree with its defaults, and the book for the script", () => {
    const { html } = render("::: materials Aspect of the End x2 :::");
    expect(html).toContain(
      '<span class="wiki-materials-count">640 ×</span> <a href="/sky/Item:Diamond">Diamond</a>',
    );
    expect(html).toContain('href="/sky/Item:Aspect_of_the_End"');
    expect(html).toContain("data-materials-book");
    expect(html).not.toMatch(/<\/script>.*<\/script>/s);
    expect(render("::: materials Nothing :::").html).toContain(
      "No recipe on this wiki makes",
    );
  });

  it("::: calculator and ::: costs show their defaults worked out", () => {
    const calc = render(
      "::: calculator Hit\ninput a: A = 2\nresult b: B = a * 21\n:::",
    ).html;
    expect(calc).toContain('<output data-result="b">42</output>');
    expect(calc).toMatch(
      /<input id="wiki-calc-\d+" type="number"[^>]*value="2" data-input="a" readonly>/,
    );
    const costs = render(
      "::: costs Tiers\ncolumns: Coins\nI: 5\nII: 10\n:::",
    ).html;
    expect(costs).toContain('data-costs-total="0">15</dd>');
    expect(render("::: calculator\nresult x: X = y\n:::").html).toContain(
      "wiki-error",
    );
  });

  it("can't be broken out of with what's typed", () => {
    const { html } = render(
      "::: calculator </script><script>alert(1)</script>\ninput a: </script> = 1\nresult b: B = a\n:::",
    );
    expect(html.match(/<script/g)).toHaveLength(1);
  });
});
