import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ISLAND_MAPS, newGame } from "./core";
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
    render(<SkygridApp signedIn={false} signInHref="/auth/github" />);
    await screen.findByRole("application");
    act(() => {
      screen.getByRole("tab", { name: "Craft" }).click();
    });
    expect(screen.getByRole("tabpanel").textContent).toContain(
      "Wooden Pickaxe",
    );
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it("plays the account's island when signed in, and keeps nothing here", async () => {
    const state = { ...newGame(3, Date.now()), coins: 4321 };
    render(
      <SkygridApp
        signedIn
        signInHref="/auth/github"
        account={{ state, version: 7 }}
        serverTime={Date.now()}
      />,
    );
    const world = await screen.findByRole("application");
    expect(screen.getByText("4,321")).toBeTruthy();
    expect(screen.getByText("Saved to your account")).toBeTruthy();
    fireEvent.keyDown(world, { key: "ArrowRight" });
    fireEvent.keyUp(world, { key: "ArrowRight" });
    expect(screen.getByText("Saving…")).toBeTruthy();
    cleanup();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it("offers to move this browser's island into a new account", async () => {
    const guest = { ...newGame(5, Date.now()), coins: 50 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(guest));
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (_url, init) => {
      calls.push(JSON.parse(init?.body as string));
      return Promise.resolve(
        Response.json(
          { state: { ...guest, seed: 9 }, version: 1, serverTime: Date.now() },
          { status: 201 },
        ),
      );
    };
    try {
      render(<SkygridApp signedIn signInHref="/auth/github" account={null} />);
      const move = await screen.findByRole("button", {
        name: "Move it to my account",
      });
      act(() => {
        move.click();
      });
      await screen.findByRole("application");
      expect(calls).toEqual([{ state: guest }]);
      expect(localStorage.getItem(SAVE_KEY)).toBeNull();
      expect(screen.getByText("50")).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });
});
