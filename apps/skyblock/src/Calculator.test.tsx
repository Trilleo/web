import { readSources, summarize } from "@trilleo/skyblock";
import { SAVED_KEYS, deckOf } from "@trilleo/skyblock/calc";
import { sourceFiles } from "@trilleo/skyblock/testing";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Calculator, SAVE_DELAY_MS } from "./Calculator";
import { CalcClient } from "./calc/client";
import { formatHours } from "./calc/format";
import type { ShardOption } from "./calc/types";
import { chooseShard } from "./test-utils";

const dataset = readSources(sourceFiles(), { minShards: 1 });
const deck = deckOf(dataset, "v1", "c", () => null);
const shards: ShardOption[] = dataset.shards.map((shard) => ({
  ...summarize(shard, null),
  id: shard.id,
  rate: shard.rate,
}));
/** Prices the fake server answers with (null: it has none yet). */
let bazaar: Record<
  string,
  {
    ask: number | null;
    bid: number | null;
    boughtWeek: number;
    soldWeek: number;
  }
> | null = null;
const deckFetch: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.includes("prices"))
    return Promise.resolve(
      new Response(
        JSON.stringify({
          fetchedAt: bazaar ? "2026-11-21T08:00:00.000Z" : null,
          prices: bazaar,
        }),
      ),
    );
  return Promise.resolve(new Response(JSON.stringify(deck)));
};
const STORE = "trilleo:tool:skyblock";

const stored = () =>
  JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<
    string,
    { value: unknown }
  >;

function renderCalculator(
  props: Partial<Parameters<typeof Calculator>[0]> = {},
) {
  const client = new CalcClient({ useWorker: false, fetcher: deckFetch });
  return render(
    <Calculator
      signedIn={false}
      signInHref="/sign-in"
      shards={shards}
      initialShard="grove"
      initialQuantity={4}
      client={client}
      {...props}
    />,
  );
}

beforeEach(() => {
  bazaar = null;
  localStorage.clear();
  window.history.replaceState(null, "", "/tools/skyblock/calculator/");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const summary = () => screen.findByTestId("calc-summary");

describe("Calculator", () => {
  it("plans the shard from the address and keeps the target in it", async () => {
    renderCalculator();
    const box = await summary();
    // 4 Grove: 2 fusions of 5 Phanpyre + 2 Bogged.
    expect(within(box).getByText("2")).toBeTruthy();
    expect(within(box).getByText(formatHours(10 / 216 + 4 / 60))).toBeTruthy();
    expect(window.location.search).toBe("?shard=grove&qty=4");
    const tree = screen.getByTestId("calc-tree");
    expect(tree.textContent).toContain("10 Phanpyre");
  });

  it("follows the quantity and the quick amounts", async () => {
    renderCalculator();
    await summary();
    fireEvent.click(screen.getByRole("button", { name: "Max (96)" }));
    await waitFor(() => {
      expect(window.location.search).toBe("?shard=grove&qty=96");
    });
    expect(within(await summary()).getByText("48")).toBeTruthy();
  });

  it("picks a shard by name", async () => {
    renderCalculator({ initialShard: null });
    expect(await screen.findByText(/Pick a shard/)).toBeTruthy();
    chooseShard("Shard to make", "tiamat");
    expect(await screen.findByTestId("calc-impossible")).toBeTruthy();
  });

  it("chooses another recipe from the alternatives, and goes back to the cheapest", async () => {
    renderCalculator();
    await summary();
    fireEvent.click(
      screen.getByRole("button", { name: "Change how to get Grove" }),
    );
    const dialog = await screen.findByTestId("calc-alternatives");
    const use = await within(dialog).findByRole("button", {
      name: /Use 5 Phanpyre \+ 2 Crocodile/,
    });
    fireEvent.click(use);
    const chosen = await screen.findByTestId("calc-chosen");
    expect(within(chosen).getByText(/Phanpyre \+ Crocodile/)).toBeTruthy();
    expect(
      within(screen.getByTestId("calc-tree")).getByText("Chosen"),
    ).toBeTruthy();
    expect(stored()[SAVED_KEYS.overrides]?.value).toEqual([
      {
        shard: "SHARD_GROVE",
        recipe: { inputs: ["SHARD_PHANPYRE", "SHARD_CROCODILE"], quantity: 2 },
      },
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "Back to the cheapest for all" }),
    );
    await waitFor(() => {
      expect(screen.queryByTestId("calc-chosen")).toBeNull();
    });
  });

  it("ticks off the checklist and keeps it", async () => {
    renderCalculator();
    const list = await screen.findByTestId("calc-checklist");
    expect(within(list).getByText("0 of 3 done")).toBeTruthy();
    const [first] = within(list).getAllByRole("checkbox");
    if (!first) throw new Error("no steps");
    fireEvent.click(first);
    expect(within(list).getByText("1 of 3 done")).toBeTruthy();
    expect(stored()[SAVED_KEYS.checklist]?.value).toEqual({
      shard: "SHARD_GROVE",
      quantity: 4,
      done: ["hunt:SHARD_SEA_ARCHER"],
    });
  });

  it("uses own hunting rates and saves the setup after a pause", async () => {
    renderCalculator();
    await summary();
    chooseShard(/^Shard(?! to)/, "Bogged");
    fireEvent.change(screen.getByLabelText("Shards an hour"), {
      target: { value: "6" },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole("button", { name: "Set rate" }));
    expect(
      within(screen.getByTestId("calc-rates")).getByText("6 an hour"),
    ).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS + 10);
    });
    expect(
      (stored()[SAVED_KEYS.settings]?.value as { rates: unknown }).rates,
    ).toEqual({ SHARD_SEA_ARCHER: 6 });
    // Bogged at 6 an hour: Grove from Phanpyre + Crocodile (12 an hour) is quicker now.
    await waitFor(() => {
      expect(
        within(screen.getByTestId("calc-summary")).getByText(
          formatHours(10 / 216 + 4 / 12),
        ),
      ).toBeTruthy();
    });
  });

  it("compares a pinned route with the current one", async () => {
    renderCalculator();
    await summary();
    fireEvent.click(screen.getByRole("button", { name: "Pin to compare" }));
    fireEvent.change(screen.getByLabelText("How many"), {
      target: { value: "8" },
    });
    const compare = await screen.findByTestId("calc-compare");
    await waitFor(() => {
      expect(within(compare).getByText("Hunt Phanpyre")).toBeTruthy();
    });
  });

  it("says when the data doesn't load", async () => {
    const client = new CalcClient({
      useWorker: false,
      fetcher: () => Promise.resolve(new Response("nope", { status: 500 })),
    });
    renderCalculator({ client });
    expect((await screen.findByRole("alert")).textContent).toMatch(/HTTP 500/);
  });

  it("takes the setup saved in this browser", async () => {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        [SAVED_KEYS.overrides]: {
          value: [{ shard: "SHARD_GROVE", recipe: null }],
          updatedAt: "2026-11-20T00:00:00.000Z",
        },
      }),
    );
    renderCalculator();
    expect(await screen.findByTestId("calc-impossible")).toBeTruthy();
  });

  it("counts coins from the Bazaar, with what the shards sell for", async () => {
    bazaar = {
      SHARD_PHANPYRE: { ask: 120, bid: 100, boughtWeek: 9, soldWeek: 9 },
      SHARD_SEA_ARCHER: { ask: 60, bid: 50, boughtWeek: 9, soldWeek: 9 },
      SHARD_GROVE: { ask: 450, bid: 400, boughtWeek: 9, soldWeek: 9 },
    };
    renderCalculator();
    await summary();
    const coins = await screen.findByRole("radio", {
      name: "Coins (buy from the Bazaar)",
    });
    await waitFor(() => {
      expect((coins as HTMLInputElement).disabled).toBe(false);
    });
    fireEvent.click(coins);
    // 4 Grove: 2 fusions of 5 Phanpyre (100) + 2 Bogged (50).
    await waitFor(() => {
      expect(
        within(screen.getByTestId("calc-summary")).getByText("1,200"),
      ).toBeTruthy();
    });
    const box = screen.getByTestId("calc-summary");
    expect(within(box).getByText("Sell instantly")).toBeTruthy();
    expect(within(box).getByText(/Profit 380, after 1.25% tax/)).toBeTruthy();
    expect(screen.getByTestId("calc-prices")).toBeTruthy();
    expect(screen.getByTestId("calc-tree").textContent).toContain("Buy");
    fireEvent.click(screen.getByLabelText("Instant buy"));
    await waitFor(() => {
      expect(
        within(screen.getByTestId("calc-summary")).getByText("1,440"),
      ).toBeTruthy();
    });
  });

  it("keeps coins off until there are prices", async () => {
    renderCalculator();
    await summary();
    const coins = screen.getByRole("radio", {
      name: "Coins (buy from the Bazaar)",
    });
    expect((coins as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByTestId("calc-prices-at").textContent).toMatch(
      /haven.t loaded/,
    );
  });
});

describe("Calculator with a collection", () => {
  const seed = (value: unknown) => {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        collection: { value, updatedAt: "2026-11-21T00:00:00.000Z" },
      }),
    );
  };

  it("uses held shards once switched on, and says which", async () => {
    seed({ levels: {}, held: { SHARD_PHANPYRE: 10 }, keep: [] });
    renderCalculator();
    const box = await summary();
    expect(within(box).getByText(formatHours(10 / 216 + 4 / 60))).toBeTruthy();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Use my collection" }),
    );
    await waitFor(() => {
      expect(
        within(screen.getByTestId("calc-summary")).getByText(
          formatHours(4 / 60),
        ),
      ).toBeTruthy();
    });
    expect(screen.getByTestId("calc-used").textContent).toContain(
      "Uses 10 shards from your collection",
    );
    expect(screen.getByTestId("calc-tree").textContent).toContain("Have");
    await waitFor(() => {
      expect(
        (stored()[SAVED_KEYS.settings]?.value as { useCollection?: boolean })
          .useCollection,
      ).toBe(true);
    });
  });

  it("offers what's left to max from the collection's level", async () => {
    seed({ levels: { SHARD_GROVE: 2 }, held: {}, keep: [] });
    renderCalculator({ initialQuantity: undefined, initialShard: null });
    await screen.findByRole("button", { name: /^Shard to make/ });
    chooseShard("Shard to make", "Grove");
    await waitFor(() => {
      expect(window.location.search).toBe("?shard=grove&qty=92");
    });
    expect(
      screen.getByRole("button", { name: "Left to max from level 2 (92)" }),
    ).toBeTruthy();
  });
});
