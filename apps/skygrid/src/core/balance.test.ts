/**
 * Pacing guard rails: rough XP per hour for steady play, turned into hours per
 * level. Retune content freely, but keep these (the plan: a few minutes to the
 * first levels, hours to the middle, tens of hours to the top).
 */
import { describe, expect, it } from "vitest";
import { ITEMS } from "./content/items";
import { NODES, type NodeDef } from "./content/nodes";
import { LEVEL_XP } from "./content/progression";

/** Time spent walking between nodes, per gather. */
const WALK_MS = 250;

function xpPerHour(node: NodeDef, tool: string | null): number {
  const speed = tool ? (ITEMS[tool]?.tool?.speed ?? 1) : 1;
  return (node.xp / (node.ms / speed + WALK_MS)) * 3_600_000;
}

function node(char: string): NodeDef {
  const found = NODES[char];
  if (!found) throw new Error(`No node ${char}`);
  return found;
}

function hoursTo(level: number, rate: number): number {
  return (LEVEL_XP[level] ?? Infinity) / rate;
}

describe("pacing", () => {
  const starter = xpPerHour(node('"'), null);
  const endgame = xpPerHour(node("o"), "iron_hoe");

  it("gets you going in minutes", () => {
    expect(hoursTo(5, starter) * 60).toBeLessThan(5);
  });

  it("takes hours to reach the middle levels", () => {
    expect(hoursTo(15, starter)).toBeGreaterThan(1);
    expect(hoursTo(15, starter)).toBeLessThan(4);
  });

  it("takes tens of hours to master a skill, even with the best tools", () => {
    expect(hoursTo(25, endgame)).toBeGreaterThan(25);
    expect(hoursTo(25, endgame)).toBeLessThan(80);
  });

  it("makes harder nodes worth more per hour", () => {
    const mining = ["*", "%", "=", "$"].map((char) =>
      xpPerHour(node(char), "iron_pickaxe"),
    );
    expect(mining).toEqual([...mining].sort((a, b) => a - b));
  });
});
