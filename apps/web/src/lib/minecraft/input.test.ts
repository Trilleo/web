import { describe, expect, it } from "vitest";
import {
  isValidSlug,
  isValidVersion,
  parseTags,
  readProjectForm,
  readReleaseForm,
  slugFromTarget,
  slugify,
  validateProject,
  validateRelease,
  type ProjectDraft,
  type ReleaseDraft,
} from "./input";

const projectDraft = (overrides: Partial<ProjectDraft> = {}): ProjectDraft => ({
  type: "mod",
  name: "  Better   Redstone ",
  slug: "",
  summary: "Smarter repeaters.",
  description: "Hello",
  edition: "java",
  tags: "Redstone, tech, redstone",
  license: "MIT",
  licenseText: "",
  links: [],
  state: "",
  ...overrides,
});

const releaseDraft = (overrides: Partial<ReleaseDraft> = {}): ReleaseDraft => ({
  version: "1.0.0",
  title: "",
  channel: "release",
  changelog: "",
  gameVersions: ["1.21.4"],
  loaders: ["fabric"],
  dependencies: [],
  ...overrides,
});

const known = new Set(["1.21.4", "1.20.4"]);

describe("slugs and tags", () => {
  it("makes addresses from names", () => {
    expect(slugify("Better Redstone!")).toBe("better-redstone");
    expect(slugify("Ćwierć Świata")).toBe("cwierc-swiata");
    expect(isValidSlug("better-redstone")).toBe(true);
    expect(isValidSlug("new")).toBe(false);
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("Bad_Slug")).toBe(false);
  });

  it("parses tags into unique slugs", () => {
    expect(parseTags("Redstone, Tech , redstone,, Quality of Life")).toEqual([
      "redstone",
      "tech",
      "quality-of-life",
    ]);
  });

  it("finds a project's slug in its address", () => {
    expect(
      slugFromTarget("https://www.trilleo.net/minecraft/mods/fabric-api/"),
    ).toBe("fabric-api");
    expect(slugFromTarget("/minecraft/plugins/shops")).toBe("shops");
    expect(slugFromTarget("fabric-api")).toBe("fabric-api");
    expect(slugFromTarget("Fabric API")).toBeNull();
  });

  it("accepts sensible version labels", () => {
    expect(isValidVersion("1.4.2")).toBe(true);
    expect(isValidVersion("2024.06-beta+fabric")).toBe(true);
    expect(isValidVersion("-1")).toBe(false);
    expect(isValidVersion("1 0")).toBe(false);
  });
});

describe("validateProject", () => {
  it("tidies a good form", () => {
    expect(validateProject(projectDraft())).toEqual({
      ok: true,
      value: {
        type: "mod",
        name: "Better Redstone",
        slug: "better-redstone",
        summary: "Smarter repeaters.",
        description: "Hello",
        edition: "java",
        tags: ["redstone", "tech"],
        license: "MIT",
        licenseText: null,
        links: [],
        state: "draft",
      },
    });
  });

  it("names each problem", () => {
    const result = validateProject(
      projectDraft({
        type: "shader",
        name: "",
        summary: "x".repeat(161),
        edition: "pocket",
        license: "WTFPL",
        state: "secret",
        links: [{ kind: "source", url: "javascript:alert(1)" }],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "edition",
      "license",
      "link-0",
      "name",
      "slug",
      "state",
      "summary",
      "type",
    ]);
  });

  it("needs the text of a custom licence, and drops it otherwise", () => {
    expect(validateProject(projectDraft({ license: "custom" }))).toMatchObject({
      ok: false,
      errors: { licenseText: expect.any(String) as string },
    });
    expect(
      validateProject(projectDraft({ license: "MIT", licenseText: "mine" })),
    ).toMatchObject({ ok: true, value: { licenseText: null } });
  });

  it("keeps web links, tidied", () => {
    expect(
      validateProject(
        projectDraft({
          links: [
            { kind: "source", url: "github.com/me/mod" },
            { kind: "bogus", url: "https://example.com" },
            { kind: "wiki", url: "" },
          ],
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {
        links: [
          { kind: "source", url: "https://github.com/me/mod" },
          { kind: "website", url: "https://example.com/" },
        ],
      },
    });
  });

  it("reads the form's fields", () => {
    const form = new FormData();
    form.set("name", "X");
    form.set("link-kind-1", "discord");
    form.set("link-url-1", "discord.gg/abc");
    const draft = readProjectForm(form);
    expect(draft.name).toBe("X");
    expect(draft.links[1]).toEqual({ kind: "discord", url: "discord.gg/abc" });
  });
});

describe("validateRelease", () => {
  it("checks versions and loaders against the project", () => {
    expect(
      validateRelease(releaseDraft(), { type: "mod", knownVersions: known }),
    ).toMatchObject({ ok: true });
    expect(
      validateRelease(releaseDraft({ gameVersions: ["9.9"] }), {
        type: "mod",
        knownVersions: known,
      }),
    ).toMatchObject({
      ok: false,
      errors: { gameVersions: expect.any(String) as string },
    });
    expect(
      validateRelease(releaseDraft({ loaders: ["paper"] }), {
        type: "mod",
        knownVersions: known,
      }),
    ).toMatchObject({
      ok: false,
      errors: { loaders: expect.any(String) as string },
    });
    // Plugins must say where they run.
    expect(
      validateRelease(releaseDraft({ loaders: [] }), {
        type: "plugin",
        knownVersions: known,
      }),
    ).toMatchObject({
      ok: false,
      errors: { loaders: expect.any(String) as string },
    });
    // Worlds have no loaders.
    expect(
      validateRelease(releaseDraft({ loaders: [] }), {
        type: "world",
        knownVersions: known,
      }),
    ).toMatchObject({ ok: true });
  });

  it("reads dependencies here and elsewhere", () => {
    const form = new FormData();
    form.set("version", "2.0");
    form.append("gameVersions", "1.21.4");
    form.set("dep-kind-0", "required");
    form.set("dep-target-0", "/minecraft/mods/fabric-api/");
    form.set("dep-url-0", "");
    form.set("dep-kind-1", "optional");
    form.set("dep-target-1", "Sodium");
    form.set("dep-url-1", "modrinth.com/mod/sodium");
    form.set("dep-kind-2", "required");
    form.set("dep-target-2", "");
    form.set("dep-url-2", "");
    const result = validateRelease(readReleaseForm(form), {
      type: "world",
      knownVersions: known,
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        version: "2.0",
        dependencies: [
          { kind: "required", slug: "fabric-api", url: null },
          {
            kind: "optional",
            slug: null,
            name: "Sodium",
            url: "https://modrinth.com/mod/sodium",
          },
        ],
      },
    });
  });

  it("refuses a dependency it can't place", () => {
    expect(
      validateRelease(
        releaseDraft({
          dependencies: [{ kind: "required", target: "Some Mod", url: "" }],
        }),
        { type: "mod", knownVersions: known },
      ),
    ).toMatchObject({
      ok: false,
      errors: { "dependency-0": expect.any(String) as string },
    });
  });
});
