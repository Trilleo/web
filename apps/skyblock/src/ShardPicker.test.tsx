import { readSources, summarize } from "@trilleo/skyblock";
import { sourceFiles } from "@trilleo/skyblock/testing";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import { LineShardField } from "./LineShardField";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RECENT_MAX,
  RECENT_SHARDS_KEY,
  ShardPicker,
  levelNote,
  readRecent,
  rememberPick,
  type PickerShard,
} from "./ShardPicker";

const shards: PickerShard[] = readSources(sourceFiles(), {
  minShards: 1,
}).shards.map((shard) => ({ ...summarize(shard, null), id: shard.id }));

function Harness({ note }: { note?: (shard: PickerShard) => string | null }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <ShardPicker
      label="Shard to make"
      shards={shards}
      value={value}
      onChange={(shard) => {
        setValue(shard.id);
      }}
      note={note}
    />
  );
}

const open = () => {
  fireEvent.click(screen.getByRole("button", { name: /^Shard to make/ }));
  return screen.getByRole("combobox", { name: "Search shards" });
};
const options = () =>
  within(screen.getByRole("listbox")).getAllByRole("option");
const names = () =>
  options().map((option) => option.querySelector(".font-medium")?.textContent);

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe("ShardPicker", () => {
  it("lists every shard by ID and picks with the keyboard", () => {
    render(<Harness />);
    expect(
      screen.getByRole("button", { name: /^Shard to make/ }).textContent,
    ).toContain("Choose a shard");
    const box = open();
    expect(names()).toEqual([
      "Grove",
      "Phanpyre",
      "Bogged",
      "Crocodile",
      "Tiamat",
    ]);
    expect(options()[0]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(box.getAttribute("aria-activedescendant")).toBe(
      options()[1]?.id ?? "",
    );
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    const trigger = screen.getByRole("button", { name: /^Shard to make/ });
    expect(trigger.textContent).toContain("Phanpyre");
    expect(trigger.textContent).toContain("C4");
  });

  it("searches by ID, words and typed filters, and filters by chips", () => {
    render(<Harness />);
    const box = open();
    fireEvent.change(box, { target: { value: "l6" } });
    expect(names()[0]).toBe("Tiamat");
    fireEvent.change(box, { target: { value: "fam:croco" } });
    expect(names()).toEqual(["Crocodile", "Tiamat"]);
    fireEvent.change(box, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Water" }));
    expect(names()).toEqual(["Bogged"]);
    expect(screen.getByTestId("shard-picker-count").textContent).toBe(
      "1 of 5 shards",
    );
    fireEvent.change(box, { target: { value: "zzzz" } });
    expect(screen.getByText("No shard matches.")).toBeTruthy();
  });

  it("puts recent picks first while nothing is typed", () => {
    render(<Harness />);
    open();
    fireEvent.click(screen.getByRole("option", { name: /Tiamat/ }));
    expect(readRecent()).toEqual(["SHARD_TIAMAT"]);
    const box = open();
    expect(names()[0]).toBe("Tiamat");
    expect(options()[0]?.textContent).toContain("Recent");
    expect(options()[0]?.textContent).toContain("Chosen");
    fireEvent.change(box, { target: { value: "grove" } });
    expect(names()).toEqual(["Grove"]);
  });

  it("shows the note for each shard", () => {
    render(<Harness note={levelNote({ SHARD_GROVE: 2, SHARD_TIAMAT: 10 })} />);
    open();
    expect(options()[0]?.textContent).toContain("Level 2 · 92 left");
    expect(options()[4]?.textContent).toContain("Maxed");
    expect(options()[1]?.textContent).not.toContain("Level");
  });
});

describe("recent picks", () => {
  it("keeps the newest few, once each", () => {
    for (let i = 0; i < RECENT_MAX + 2; i++) rememberPick(`S${String(i)}`);
    rememberPick("S3");
    const recent = readRecent();
    expect(recent).toHaveLength(RECENT_MAX);
    expect(recent[0]).toBe("S3");
    expect(new Set(recent).size).toBe(RECENT_MAX);
  });

  it("reads broken storage as none", () => {
    localStorage.setItem(RECENT_SHARDS_KEY, "{broken");
    expect(readRecent()).toEqual([]);
    localStorage.setItem(RECENT_SHARDS_KEY, JSON.stringify([1, "S1"]));
    expect(readRecent()).toEqual(["S1"]);
  });
});

describe("LineShardField", () => {
  it("is a plain select on the server, and the picker in the browser", () => {
    const html = renderToString(
      <LineShardField shards={shards} value="tiamat" />,
    );
    expect(html).toContain('<select name="shard"');
    render(<LineShardField shards={shards} value="tiamat" />);
    expect(
      screen.getByRole("button", { name: /^Centre on/ }).textContent,
    ).toContain("Tiamat");
    expect(
      document.querySelector<HTMLInputElement>('input[name="shard"]')?.value,
    ).toBe("tiamat");
  });
});
