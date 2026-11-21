import { readSources, summarize } from "@trilleo/skyblock";
import { COLLECTION_FILE_FORMAT, SAVED_KEYS } from "@trilleo/skyblock/calc";
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
import {
  COLLECTION_PAGE_SIZE,
  Collection,
  COLLECTION_SAVE_DELAY_MS,
  collectionTotals,
  type CollectionShard,
} from "./Collection";

const dataset = readSources(sourceFiles(), { minShards: 1 });
const shards: CollectionShard[] = dataset.shards.map((shard) => ({
  ...summarize(shard, null),
  id: shard.id,
}));
const STORE = "trilleo:tool:skyblock";
const stored = () =>
  JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<
    string,
    { value: unknown }
  >;
const row = (id: string) => {
  const found = screen
    .getAllByTestId("collection-row")
    .find((el) => el.dataset.shard === id);
  if (!found) throw new Error(`no row for ${id}`);
  return found;
};

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

describe("Collection", () => {
  it("keeps a profile's collection under its prefix, apart from the others", async () => {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        [SAVED_KEYS.collection]: {
          value: { levels: { SHARD_GROVE: 4 }, held: {}, keep: [] },
          updatedAt: "2026-11-21T08:00:00.000Z",
        },
      }),
    );
    render(
      <Collection
        signedIn={false}
        signInHref="/sign-in"
        shards={shards}
        profilePrefix="p7-"
      />,
    );
    // Main's level (4) never shows here, even once storage has loaded.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const level = within(row("SHARD_GROVE")).getByLabelText<HTMLInputElement>(
      "Grove: level",
    );
    expect(level.value).toBe("0");
    fireEvent.change(level, { target: { value: "2" } });
    await waitFor(
      () => {
        expect(stored()[`p7-${SAVED_KEYS.collection}`]?.value).toEqual({
          levels: { SHARD_GROVE: 2 },
          held: {},
          keep: [],
        });
      },
      { timeout: COLLECTION_SAVE_DELAY_MS + 1000 },
    );
    expect(stored()[SAVED_KEYS.collection]?.value).toEqual({
      levels: { SHARD_GROVE: 4 },
      held: {},
      keep: [],
    });
  });

  it("keeps levels and held shards, and totals them", async () => {
    render(
      <Collection signedIn={false} signInHref="/sign-in" shards={shards} />,
    );
    const grove = row("SHARD_GROVE");
    fireEvent.change(within(grove).getByLabelText("Grove: level"), {
      target: { value: "10" },
    });
    fireEvent.change(
      within(row("SHARD_TIAMAT")).getByLabelText("Tiamat: level"),
      {
        target: { value: "3" },
      },
    );
    fireEvent.change(
      within(row("SHARD_PHANPYRE")).getByLabelText("Phanpyre: held"),
      {
        target: { value: "40" },
      },
    );
    await waitFor(
      () => {
        expect(stored()[SAVED_KEYS.collection]?.value).toEqual({
          levels: { SHARD_GROVE: 10, SHARD_TIAMAT: 3 },
          held: { SHARD_PHANPYRE: 40 },
          keep: [],
        });
      },
      { timeout: COLLECTION_SAVE_DELAY_MS + 1000 },
    );
    const totals = screen.getByTestId("collection-totals");
    expect(within(totals).getByText("1 of 5")).toBeTruthy();
    expect(within(grove).getByText("Maxed")).toBeTruthy();
    // Tiamat at 3: 21 left of 24.
    expect(within(row("SHARD_TIAMAT")).getByText("21 of 24 left")).toBeTruthy();
    expect(
      within(row("SHARD_TIAMAT"))
        .getByRole("link", { name: "Plan it" })
        .getAttribute("href"),
    ).toBe("/tools/skyblock/calculator/?shard=tiamat&qty=21");
  });

  it("filters to what's held", async () => {
    localStorage.setItem(
      STORE,
      JSON.stringify({
        collection: {
          value: {
            levels: {},
            held: { SHARD_GROVE: 2 },
            keep: ["SHARD_GROVE"],
          },
          updatedAt: "2026-11-21T00:00:00.000Z",
        },
      }),
    );
    render(
      <Collection signedIn={false} signInHref="/sign-in" shards={shards} />,
    );
    await waitFor(() => {
      expect(
        within(row("SHARD_GROVE")).getByLabelText<HTMLInputElement>(
          "Grove: keep out of plans",
        ).checked,
      ).toBe(true);
    });
    fireEvent.change(screen.getByLabelText("Show"), {
      target: { value: "held" },
    });
    expect(screen.getAllByTestId("collection-row")).toHaveLength(1);
    expect(screen.getByTestId("collection-count").textContent).toBe(
      "1 of 5 shards",
    );
  });

  it("loads a downloaded copy, and refuses anything else", async () => {
    render(
      <Collection signedIn={false} signInHref="/sign-in" shards={shards} />,
    );
    const input = screen.getByTestId("collection-file");
    const file = new File(
      [
        JSON.stringify({
          format: COLLECTION_FILE_FORMAT,
          version: 1,
          levels: { SHARD_BOGUS: 2, SHARD_GROVE: 4 },
          held: {},
          keep: [],
        }),
      ],
      "copy.json",
      { type: "application/json" },
    );
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(
        within(row("SHARD_GROVE")).getByLabelText<HTMLSelectElement>(
          "Grove: level",
        ).value,
      ).toBe("4");
    });
    expect(stored()[SAVED_KEYS.collection]?.value).toMatchObject({
      levels: { SHARD_GROVE: 4 },
    });
  });

  it("counts what's left to max everything", () => {
    const totals = collectionTotals(shards, {
      levels: { SHARD_GROVE: 10 },
      held: { SHARD_GROVE: 3 },
      keep: [],
    });
    // Commons 96 ×2, Uncommon 64, Rare 48, Legendary 24, less Grove's 96.
    expect(totals).toEqual({
      maxed: 1,
      started: 0,
      left: 96 + 64 + 48 + 24,
      held: 3,
      kinds: 1,
    });
  });
});

describe("Collection with many shards", () => {
  it("shows them a page at a time, starting over when the filters change", () => {
    const many: CollectionShard[] = readSources(sourceFiles({ extra: 70 }), {
      minShards: 1,
    }).shards.map((shard) => ({ ...summarize(shard, null), id: shard.id }));
    render(<Collection signedIn={false} signInHref="/sign-in" shards={many} />);
    expect(screen.getAllByTestId("collection-row")).toHaveLength(
      COLLECTION_PAGE_SIZE,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Show more/ }));
    expect(screen.getAllByTestId("collection-row")).toHaveLength(many.length);
    fireEvent.change(screen.getByLabelText("Rarity"), {
      target: { value: "epic" },
    });
    expect(screen.getAllByTestId("collection-row")).toHaveLength(
      COLLECTION_PAGE_SIZE,
    );
  });
});
