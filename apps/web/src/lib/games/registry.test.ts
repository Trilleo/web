import type { GameMeta } from "@trilleo/tool-kit";
import { describe, expect, it } from "vitest";
import { GAMES, findGame, gameListings, gamePath } from "./registry";

const planned: GameMeta = {
  slug: "someday",
  name: "Someday",
  description: "Not built yet.",
  status: "planned",
  shape: "circle",
};

describe("the games registry", () => {
  it("lists Skygrid, with unique slugs fit for URLs", () => {
    const slugs = GAMES.map((game) => game.slug);
    expect(slugs).toContain("skygrid");
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("finds games by slug", () => {
    expect(findGame("skygrid")?.name).toBe("Skygrid");
    expect(findGame("nope")).toBeUndefined();
    expect(findGame(undefined)).toBeUndefined();
  });

  it("links games that exist, and not planned ones", () => {
    const [skygrid, someday] = gameListings([...GAMES, planned]);
    expect(skygrid).toMatchObject({
      name: "Skygrid",
      href: gamePath("skygrid"),
      path: "/games/skygrid",
    });
    expect(someday).toMatchObject({ href: null, path: "/games/someday" });
  });
});
