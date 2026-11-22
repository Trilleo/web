import { fireEvent, screen } from "@testing-library/react";

/** Picks a shard through a ShardPicker: open it by its label, search, press Enter. */
export function chooseShard(label: string | RegExp, search: string): void {
  const name = typeof label === "string" ? new RegExp(`^${label}`) : label;
  fireEvent.click(screen.getByRole("button", { name }));
  const box = screen.getByRole("combobox", { name: "Search shards" });
  fireEvent.change(box, { target: { value: search } });
  fireEvent.keyDown(box, { key: "Enter" });
}
