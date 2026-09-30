import { describe, expect, it } from "vitest";
import { ISLANDS } from "../types";
import {
  ISLAND_MAPS,
  MONO_GLYPHS,
  NEIGHBOURS,
  arrivalFrom,
  charAt,
  isWalkable,
  tileKind,
  type Island,
} from "./islands";

/** Every walkable tile reachable from `start` without passing through a portal. */
function reachable(
  island: Island,
  start: { x: number; y: number },
): Set<string> {
  const seen = new Set([`${String(start.x)},${String(start.y)}`]);
  const queue = [start];
  while (queue.length > 0) {
    const at = queue.shift();
    if (!at) break;
    for (const [dx, dy] of NEIGHBOURS) {
      const x = at.x + dx;
      const y = at.y + dy;
      const key = `${String(x)},${String(y)}`;
      const char = charAt(island, x, y);
      if (seen.has(key) || !isWalkable(char) || tileKind(char) === "portal")
        continue;
      seen.add(key);
      queue.push({ x, y });
    }
  }
  return seen;
}

describe.each(ISLANDS)("the %s island", (id) => {
  const island = ISLAND_MAPS[id];
  const area = reachable(island, island.spawn);

  it("starts on ground", () => {
    expect(tileKind(charAt(island, island.spawn.x, island.spawn.y))).toBe(
      "ground",
    );
  });

  it("lets you reach everything on it", () => {
    const stranded: string[] = [];
    island.tiles.forEach((row, y) => {
      row.forEach((char, x) => {
        const kind = tileKind(char);
        if (
          ![
            "node",
            "mob",
            "slot",
            "merchant",
            "guide",
            "portal",
            "water",
          ].includes(kind)
        ) {
          return;
        }
        const nextTo = NEIGHBOURS.some(([dx, dy]) =>
          area.has(`${String(x + dx)},${String(y + dy)}`),
        );
        // Water only needs some shore; the rest is scenery.
        if (!nextTo && kind !== "water")
          stranded.push(`${char} at ${String(x)},${String(y)}`);
      });
    });
    expect(stranded).toEqual([]);
  });

  it("has portals that lead somewhere and back", () => {
    for (const portal of island.portals) {
      const target = ISLAND_MAPS[portal.to];
      expect(target.portals.map((p) => p.to)).toContain(id);
      const arrival = arrivalFrom(target, id);
      expect(tileKind(charAt(target, arrival.x, arrival.y))).toBe("ground");
    }
  });
});

describe("the islands", () => {
  it("are drawn only with characters Geist Mono has", () => {
    const outside = new Set<string>();
    for (const id of ISLANDS) {
      for (const row of ISLAND_MAPS[id].grid) {
        for (const char of row) if (!MONO_GLYPHS.test(char)) outside.add(char);
      }
    }
    expect([...outside]).toEqual([]);
  });

  it("connect: every island can be reached from home", () => {
    const seen = new Set<string>(["home"]);
    const queue = ["home" as const] as (keyof typeof ISLAND_MAPS)[];
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      for (const portal of ISLAND_MAPS[id].portals) {
        if (!seen.has(portal.to)) {
          seen.add(portal.to);
          queue.push(portal.to);
        }
      }
    }
    expect([...seen].sort()).toEqual([...ISLANDS].sort());
  });

  it("give your island five minion slots, and nobody else any", () => {
    expect(ISLAND_MAPS.home.slots).toHaveLength(5);
    for (const id of ISLANDS) {
      if (id !== "home") expect(ISLAND_MAPS[id].slots).toHaveLength(0);
    }
  });

  it("have the merchant and the guide in the hub", () => {
    const hub = ISLAND_MAPS.hub.rows.join("");
    expect(hub).toContain("M");
    expect(hub).toContain("G");
  });
});
