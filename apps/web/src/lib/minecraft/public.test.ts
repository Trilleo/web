import type { McProject, User } from "@trilleo/db";
import { describe, expect, it } from "vitest";
import {
  countLabel,
  creditOf,
  isFiltered,
  listingHref,
  projectCard,
  projectJsonLd,
  readListingQuery,
  toListFilter,
} from "./public";

const owner = {
  username: "alice",
  name: "Alice A.",
  displayName: null,
  profilePublic: true,
} as User;

const project = {
  id: 1,
  slug: "better-redstone",
  type: "mod",
  edition: "java",
  name: "Better Redstone",
  tags: ["redstone"],
  license: "MIT",
  firstReleasedAt: new Date("2026-10-01T00:00:00Z"),
  lastReleasedAt: new Date("2026-10-05T00:00:00Z"),
  updatedAt: new Date("2026-10-05T00:00:00Z"),
} as McProject;

describe("listing queries", () => {
  it("reads filters from the URL and drops what isn't valid", () => {
    const query = readListingQuery(
      new URL(
        "https://x/minecraft/mods/?q=%20redstone%20&version=1.21.4&loader=fabric&edition=pocket&tag=Bad Tag&sort=nope&page=3",
      ),
    );
    expect(query).toEqual({
      q: "redstone",
      version: "1.21.4",
      loader: "fabric",
      edition: "",
      tag: "",
      sort: "",
      page: 3,
    });
    expect(isFiltered(query)).toBe(true);
    expect(toListFilter(query, "mod")).toMatchObject({
      type: "mod",
      q: "redstone",
      version: "1.21.4",
      loader: "fabric",
      page: 3,
    });
    expect(
      isFiltered(readListingQuery(new URL("https://x/minecraft/mods/"))),
    ).toBe(false);
  });

  it("builds links that change one filter and start again from page 1", () => {
    const query = readListingQuery(
      new URL("https://x/minecraft/mods/?q=x&page=2&tag=tech"),
    );
    expect(listingHref("/minecraft/mods/", query, { tag: "" })).toBe(
      "/minecraft/mods/?q=x",
    );
    expect(listingHref("/minecraft/mods/", query, { page: 3 })).toBe(
      "/minecraft/mods/?q=x&tag=tech&page=3",
    );
  });

  it("counts by kind", () => {
    expect(countLabel(1, "mod")).toBe("1 mod");
    expect(countLabel(2, "resource_pack")).toBe("2 resource packs");
    expect(countLabel(1200)).toBe("1,200 projects");
  });
});

describe("credits", () => {
  it("follow the profile rules", () => {
    expect(creditOf(owner)).toEqual({
      login: "alice",
      name: "Alice A.",
      profile: "/people/alice/",
      creations: "/minecraft/creators/alice/",
    });
    expect(creditOf({ ...owner, profilePublic: false })).toMatchObject({
      name: null,
      profile: null,
    });
  });
});

describe("share cards and structured data", () => {
  it("draws a project's card", () => {
    expect(projectCard(project, owner, ["1.21.4", "1.21.3"])).toEqual({
      section: "(05) Minecraft / Mod",
      title: "Better Redstone",
      meta: "@alice · 1.21.3–1.21.4",
    });
  });

  it("calls mods software and worlds creative works", () => {
    const base = {
      owner,
      latest: null,
      gameVersions: ["1.21.4"],
      loaders: ["fabric"],
      downloads: 7,
      image: "/og/x.png",
      description: "Smarter repeaters.",
    };
    expect(projectJsonLd({ ...base, project })).toMatchObject({
      "@type": "SoftwareApplication",
      applicationSubCategory: "Minecraft mod",
      license: "https://opensource.org/license/mit",
      softwareRequirements: "Fabric",
      author: {
        name: "Alice A.",
        url: "https://www.trilleo.net/minecraft/creators/alice/",
      },
      interactionStatistic: { userInteractionCount: 7 },
    });
    const world = projectJsonLd({
      ...base,
      project: { ...project, type: "world" },
      owner: { ...owner, profilePublic: false },
    });
    expect(world).toMatchObject({
      "@type": "CreativeWork",
      genre: "World",
      author: { name: "@alice" },
    });
  });
});
