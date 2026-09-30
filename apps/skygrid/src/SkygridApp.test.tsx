import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ISLAND_MAPS } from "./core";
import { SkygridApp } from "./SkygridApp";
import { SAVE_KEY } from "./ui/session";

describe("SkygridApp", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  it("starts you on your island, and walks with the arrow keys", async () => {
    render(<SkygridApp signedIn={false} signInHref="/auth/github" />);
    const world = await screen.findByRole("application");
    expect(world.getAttribute("aria-label")).toMatch(/^Your Island\./);
    expect(
      screen.getByRole("list", { name: "What happened" }).textContent,
    ).toMatch(/wake up/);

    const { spawn } = ISLAND_MAPS.home;
    const at = () => {
      const rows = [...screen.getByTestId("world").children].filter(
        (row) => row.tagName === "DIV",
      );
      const y = rows.findIndex((row) => row.textContent.includes("@"));
      return {
        x: [...(rows[y]?.children ?? [])].findIndex(
          (c) => c.textContent === "@",
        ),
        y,
      };
    };
    expect(at()).toEqual(spawn);

    fireEvent.keyDown(world, { key: "ArrowRight" });
    fireEvent.keyUp(world, { key: "ArrowRight" });
    expect(at()).toEqual({ x: spawn.x + 1, y: spawn.y });
  });

  it("offers sign-in when signed out", async () => {
    render(<SkygridApp signedIn={false} signInHref="/auth/github?next=x" />);
    await screen.findByRole("application");
    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/auth/github?next=x");
  });

  it("switches panels", async () => {
    render(<SkygridApp signedIn signInHref="/auth/github" />);
    await screen.findByRole("application");
    act(() => {
      screen.getByRole("tab", { name: "Craft" }).click();
    });
    expect(screen.getByRole("tabpanel").textContent).toContain(
      "Wooden Pickaxe",
    );
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });
});
