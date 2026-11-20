import { readSources, summarize } from "@trilleo/skyblock";
import { sourceFiles } from "@trilleo/skyblock/testing";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PAGE_SIZE, ShardBrowser } from "./ShardBrowser";
import { UTILITIES, meta, shardPath } from "./meta";

afterEach(cleanup);

const shards = (extra = 0) =>
  readSources(sourceFiles({ extra }), { minShards: 1 }).shards.map((shard) =>
    summarize(
      shard,
      shard.key === "L6" ? "/tools/skyblock/shard-icons/tiamat.webp" : null,
    ),
  );

const names = () =>
  within(screen.getByTestId("shard-list"))
    .getAllByRole("link")
    .map((link) => link.textContent);

describe("ShardBrowser", () => {
  it("lists every shard, rarest last, each linking its page", () => {
    render(<ShardBrowser shards={shards()} />);
    expect(names()).toEqual([
      "Grove",
      "Phanpyre",
      "Bogged",
      "Crocodile",
      "Tiamat",
    ]);
    expect(
      screen.getByRole("link", { name: "Tiamat" }).getAttribute("href"),
    ).toBe("/tools/skyblock/shards/tiamat/");
    expect(screen.getByTestId("shard-count").textContent).toBe("5 shards");
  });

  it("searches and filters", () => {
    render(<ShardBrowser shards={shards()} initialQuery="health" />);
    expect(names()).toEqual(["Grove"]);
    fireEvent.change(screen.getByLabelText("Name, attribute or effect"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Family"), {
      target: { value: "Croco" },
    });
    expect(names()).toEqual(["Crocodile", "Tiamat"]);
    expect(screen.getByTestId("shard-count").textContent).toBe("2 of 5 shards");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(names()).toHaveLength(5);
  });

  it("says when nothing matches", () => {
    render(<ShardBrowser shards={shards()} initialQuery="zzzz" />);
    expect(screen.getByText(/No shard matches/)).toBeTruthy();
  });

  it("shows a page at a time", () => {
    render(<ShardBrowser shards={shards(100)} />);
    expect(names()).toHaveLength(PAGE_SIZE);
    fireEvent.click(screen.getByRole("button", { name: /Show more/ }));
    expect(names()).toHaveLength(105);
  });
});

describe("meta", () => {
  it("addresses shards under the tool, and lists the Shards utility as built", () => {
    expect(meta.slug).toBe("skyblock");
    expect(shardPath("lizard-king")).toBe(
      "/tools/skyblock/shards/lizard-king/",
    );
    expect(UTILITIES[0]?.href).toBe("/tools/skyblock/shards/");
  });
});
