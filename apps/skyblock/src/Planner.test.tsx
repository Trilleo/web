import { readSources, summarize } from "@trilleo/skyblock";
import { SAVED_KEYS, deckOf } from "@trilleo/skyblock/calc";
import { sourceFiles } from "@trilleo/skyblock/testing";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CalcClient } from "./calc/client";
import { formatHours } from "./calc/format";
import { Planner, groupHunt, type PlannerShard } from "./Planner";

const dataset = readSources(sourceFiles(), { minShards: 1 });
const deck = deckOf(dataset, "v1", "c", () => null);
const shards: PlannerShard[] = dataset.shards.map((shard) => {
  const summary = summarize(shard, null);
  return {
    id: shard.id,
    slug: summary.slug,
    name: summary.name,
    rarity: summary.rarity,
    icon: null,
    rate: shard.rate,
    category: shard.category,
    families: shard.families,
    where: shard.id === "SHARD_PHANPYRE" ? ["Place Hunting Traps."] : [],
  };
});
const fetcher: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  return Promise.resolve(
    new Response(
      url.includes("prices")
        ? JSON.stringify({ fetchedAt: null, prices: null })
        : JSON.stringify(deck),
    ),
  );
};
const firstTarget = (targets: HTMLElement[]) => {
  const [first] = targets;
  if (!first) throw new Error("no target");
  return first;
};
const STORE = "trilleo:tool:skyblock";
const stored = () =>
  JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<
    string,
    { value: unknown }
  >;
const renderPlanner = () =>
  render(
    <Planner
      signedIn={false}
      signInHref="/sign-in"
      shards={shards}
      client={new CalcClient({ useWorker: false, fetcher })}
    />,
  );

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

describe("Planner", () => {
  it("plans what's added, grouped by where it's hunted", async () => {
    renderPlanner();
    fireEvent.change(screen.getByLabelText("Add a shard"), {
      target: { value: "Grove" },
    });
    fireEvent.change(screen.getByLabelText("How many"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    const summary = await screen.findByTestId("planner-summary");
    // 4 Grove: 10 Phanpyre + 4 Bogged.
    expect(
      within(summary).getByText(formatHours(10 / 216 + 4 / 60)),
    ).toBeTruthy();
    const hunt = screen.getByTestId("planner-hunt");
    expect(within(hunt).getByText("Forest")).toBeTruthy();
    expect(within(hunt).getByText("Water")).toBeTruthy();
    expect(hunt.textContent).toContain("Place Hunting Traps.");
    expect(screen.getByTestId("planner-checklist").textContent).toContain(
      "Fuse 2×",
    );
    await waitFor(() => {
      expect(stored()[SAVED_KEYS.planner]?.value).toEqual({
        targets: [{ shard: "SHARD_GROVE", quantity: 4 }],
        done: [],
      });
    });
  });

  it("fills the list with what's left to max in the collection", async () => {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        collection: {
          value: {
            levels: { SHARD_GROVE: 10, SHARD_PHANPYRE: 9 },
            held: {},
            keep: [],
          },
          updatedAt: "2026-11-21T00:00:00.000Z",
        },
      }),
    );
    renderPlanner();
    fireEvent.change(
      await screen.findByLabelText(
        "Or plan what’s left to max in your collection",
      ),
      {
        target: { value: "category:Forest" },
      },
    );
    await waitFor(() => {
      expect(
        screen.getByText("1 shards not maxed. This replaces the list."),
      ).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Fill the list" }));
    const targets = await screen.findAllByTestId("planner-target");
    expect(targets).toHaveLength(1);
    // Phanpyre at 9: 24 left.
    expect(
      within(firstTarget(targets)).getByLabelText<HTMLInputElement>(
        "Phanpyre: how many",
      ).value,
    ).toBe("24");
  });

  it("groups by category, dearest first", () => {
    const byId = new Map(shards.map((shard) => [shard.id, shard]));
    const groups = groupHunt(
      [
        { shard: "SHARD_PHANPYRE", quantity: 5, cost: 1 },
        { shard: "SHARD_SEA_ARCHER", quantity: 2, cost: 3 },
      ],
      byId,
    );
    expect(groups.map((g) => g.category)).toEqual(["Water", "Forest"]);
  });
});
