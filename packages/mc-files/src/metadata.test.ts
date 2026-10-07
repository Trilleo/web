import { makeZip } from "@trilleo/storage/testing";
import { describe, expect, it } from "vitest";
import { readHints, type FileHints, type Source } from "./metadata";
import { readNbt } from "./nbt";
import { writeNbt } from "./testing";
import { matchVersions } from "./versions";

const KNOWN = [
  "1.21.5",
  "1.21.4",
  "1.21.3",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.1",
];

function source(name: string, bytes: Uint8Array): Source {
  return {
    name,
    size: bytes.length,
    read: (start, end) => Promise.resolve(bytes.slice(start, end)),
  };
}

const zip = (entries: Parameters<typeof makeZip>[0]) => makeZip(entries);

async function hints(name: string, bytes: Uint8Array): Promise<FileHints> {
  const found = await readHints(source(name, bytes));
  if (!found) throw new Error("no hints");
  return found;
}

const versions = (found: FileHints) =>
  found.gameVersions ? matchVersions(found.gameVersions, KNOWN) : [];

describe("mods", () => {
  it("reads a Fabric mod, with its dependencies", async () => {
    const found = await hints(
      "better-redstone.jar",
      zip([
        { name: "META-INF/MANIFEST.MF", data: "Manifest-Version: 1.0\n" },
        {
          name: "fabric.mod.json",
          deflate: true,
          data: JSON.stringify({
            schemaVersion: 1,
            id: "better-redstone",
            version: "1.4.2+1.21.4",
            name: "Better Redstone",
            description: "Smarter repeaters.",
            depends: {
              fabricloader: ">=0.16",
              minecraft: "~1.21.3",
              java: ">=21",
              "fabric-api": "*",
            },
            recommends: { modmenu: "*" },
            breaks: { optifabric: "*" },
          }),
        },
      ]),
    );
    expect(found).toMatchObject({
      label: "Fabric mod",
      kind: "mod",
      name: "Better Redstone",
      version: "1.4.2+1.21.4",
      description: "Smarter repeaters.",
      loaders: ["fabric"],
    });
    expect(versions(found)).toEqual(["1.21.5", "1.21.4", "1.21.3"]);
    expect(found.dependencies).toEqual([
      {
        kind: "required",
        id: "fabric-api",
        name: "Fabric API",
        url: "https://modrinth.com/mod/fabric-api",
      },
      {
        kind: "optional",
        id: "modmenu",
        name: "Mod Menu",
        url: "https://modrinth.com/mod/modmenu",
      },
      {
        kind: "incompatible",
        id: "optifabric",
        name: "optifabric",
        url: "https://modrinth.com/mod/optifabric",
      },
    ]);
  });

  it("reads a NeoForge mods.toml", async () => {
    const toml = `modLoader="javafml"
loaderVersion="[4,)"
license="MIT"

[[mods]]
modId="tiny_tweaks"
version="2.0.0"
displayName="Tiny Tweaks"
description='''
Small things.
'''

[[dependencies.tiny_tweaks]]
    modId="neoforge"
    type="required"
    versionRange="[21.1,)"

[[dependencies.tiny_tweaks]]
    modId="minecraft"
    type="required"
    versionRange="[1.21.1,1.21.4)"

[[dependencies.tiny_tweaks]]
    modId="jei"
    type="optional"
    versionRange="*"
`;
    const found = await hints(
      "tiny.jar",
      zip([{ name: "META-INF/neoforge.mods.toml", data: toml }]),
    );
    expect(found).toMatchObject({
      label: "NeoForge mod",
      name: "Tiny Tweaks",
      version: "2.0.0",
      loaders: ["neoforge"],
      dependencies: [
        { kind: "optional", id: "jei", name: "Just Enough Items" },
      ],
    });
    expect(versions(found)).toEqual(["1.21.3", "1.21.1"]);
  });

  it("skips unfilled build placeholders", async () => {
    const found = await hints(
      "x.jar",
      zip([
        {
          name: "fabric.mod.json",
          data: JSON.stringify({ id: "x", version: "${version}" }),
        },
      ]),
    );
    expect(found.version).toBeUndefined();
    expect(found.name).toBe("x");
  });
});

describe("plugins", () => {
  it("reads plugin.yml", async () => {
    const yml = `name: TinyShops
version: '3.1'
main: net.example.TinyShops
api-version: 1.21
description: Chest shops.
depend: [Vault]
softdepend:
  - PlaceholderAPI
  - WorldGuard
`;
    const found = await hints(
      "shops.jar",
      zip([{ name: "plugin.yml", data: yml }]),
    );
    expect(found).toMatchObject({
      label: "Bukkit plugin",
      kind: "plugin",
      name: "TinyShops",
      version: "3.1",
      description: "Chest shops.",
      loaders: ["paper", "spigot", "bukkit"],
      notes: ["Needs Vault", "Works with PlaceholderAPI, WorldGuard"],
    });
    expect(versions(found)).toEqual([
      "1.21.5",
      "1.21.4",
      "1.21.3",
      "1.21.1",
      "1.21",
    ]);
  });

  it("reads a crafted plugin.yml quickly", async () => {
    // A list of many "- -" lines: the kind that made the old pattern backtrack.
    const yml = `name: Slow\ndepend:\n${"  - -\n".repeat(20_000)}x`;
    const start = performance.now();
    const found = await hints(
      "slow.jar",
      zip([{ name: "plugin.yml", data: yml }]),
    );
    expect(performance.now() - start).toBeLessThan(1000);
    expect(found.name).toBe("Slow");
  });

  it("prefers paper-plugin.yml", async () => {
    const found = await hints(
      "p.jar",
      zip([
        {
          name: "paper-plugin.yml",
          data: "name: P\nversion: 1\napi-version: '1.20'\n",
        },
        { name: "plugin.yml", data: "name: Q\n" },
      ]),
    );
    expect(found).toMatchObject({
      label: "Paper plugin",
      name: "P",
      loaders: ["paper"],
    });
  });
});

describe("packs", () => {
  it("reads a resource pack's formats", async () => {
    const found = await hints(
      "crisp.zip",
      zip([
        {
          name: "Crisp/pack.mcmeta",
          data: JSON.stringify({
            pack: {
              pack_format: 34,
              supported_formats: [34, 46],
              description: "§6Crisp §rtextures",
            },
          }),
        },
        { name: "Crisp/assets/minecraft/textures/block/stone.png", data: "x" },
      ]),
    );
    expect(found).toMatchObject({
      label: "Resource pack",
      kind: "resource_pack",
      description: "Crisp textures",
    });
    expect(versions(found)).toEqual(["1.21.4", "1.21.3", "1.21.1", "1.21"]);
  });

  it("tells a data pack by its data folder", async () => {
    const found = await hints(
      "dp.zip",
      zip([
        {
          name: "pack.mcmeta",
          data: '{"pack":{"pack_format":48,"description":"d"}}',
        },
        { name: "data/example/function/hi.mcfunction", data: "say hi" },
      ]),
    );
    expect(found.kind).toBe("data_pack");
    expect(versions(found)).toEqual(["1.21.1", "1.21"]);
  });

  it("reads a Bedrock manifest", async () => {
    const found = await hints(
      "pack.mcpack",
      zip([
        {
          name: "manifest.json",
          data: `{
  // made by hand
  "format_version": 2,
  "header": { "name": "Lanterns", "description": "Glow", "version": [1, 2, 0], "min_engine_version": [1, 21, 0] },
  "modules": [{ "type": "data", "version": [1, 0, 0] }]
}`,
        },
      ]),
    );
    expect(found).toMatchObject({
      label: "Bedrock behaviour pack",
      edition: "bedrock",
      name: "Lanterns",
      version: "1.2.0",
      gameVersions: { kind: "exact", versions: ["1.21.x"] },
    });
  });
});

describe("worlds and builds", () => {
  it("reads a zipped Java world's level.dat", async () => {
    const level = writeNbt(
      {
        Data: {
          compound: {
            LevelName: { string: "Sky Temple" },
            DataVersion: { int: 4189 },
            Version: { compound: { Name: { string: "1.21.4" } } },
          },
        },
      },
      { gzip: true },
    );
    const found = await hints(
      "temple.zip",
      zip([
        { name: "Sky Temple/level.dat", data: level },
        { name: "Sky Temple/region/r.0.0.mca", data: "x" },
      ]),
    );
    expect(found).toMatchObject({
      label: "Java world",
      kind: "world",
      name: "Sky Temple",
      notes: ["Saved in 1.21.4"],
    });
    expect(versions(found)).toEqual(["1.21.4"]);
  });

  it("reads a Bedrock world", async () => {
    const nbt = writeNbt(
      {
        lastOpenedWithVersion: {
          of: 3,
          list: [{ int: 1 }, { int: 21 }, { int: 50 }, { int: 7 }, { int: 0 }],
        },
      },
      { little: true },
    );
    const level = new Uint8Array(8 + nbt.length);
    level.set(nbt, 8);
    const found = await hints(
      "island.mcworld",
      zip([
        { name: "levelname.txt", data: "Island" },
        { name: "level.dat", data: level },
        { name: "db/CURRENT", data: "MANIFEST-000001\n" },
      ]),
    );
    expect(found).toMatchObject({
      label: "Bedrock world",
      edition: "bedrock",
      name: "Island",
      gameVersions: { kind: "exact", versions: ["1.21.x"] },
    });
  });

  it("reads a Litematica schematic", async () => {
    const bytes = writeNbt(
      {
        MinecraftDataVersion: { int: 3953 },
        Version: { int: 6 },
        Metadata: {
          compound: {
            Name: { string: "Tower" },
            Author: { string: "alice" },
            Description: { string: "A tall one" },
            TotalBlocks: { int: 1234 },
            EnclosingSize: {
              compound: { x: { int: 9 }, y: { int: 40 }, z: { int: 9 } },
            },
          },
        },
      },
      { gzip: true },
    );
    const found = await hints("tower.litematic", bytes);
    expect(found).toMatchObject({
      label: "Litematica schematic",
      kind: "build",
      name: "Tower",
      description: "A tall one",
      notes: [
        "9 × 40 × 9 blocks",
        "1,234 blocks placed",
        "By alice",
        "Made in 1.21",
      ],
    });
    expect(versions(found)).toEqual([
      "1.21.5",
      "1.21.4",
      "1.21.3",
      "1.21.1",
      "1.21",
    ]);
  });

  it("reads a Sponge v3 schematic", async () => {
    const bytes = writeNbt(
      {
        Schematic: {
          compound: {
            Version: { int: 3 },
            DataVersion: { int: 3465 },
            Width: { short: 5 },
            Height: { short: 6 },
            Length: { short: 7 },
            Metadata: { compound: { Name: { string: "Hut" } } },
          },
        },
      },
      { gzip: true },
    );
    const found = await hints("hut.schem", bytes);
    expect(found).toMatchObject({
      label: "Sponge schematic",
      name: "Hut",
      notes: ["5 × 6 × 7 blocks", "Made in 1.20.1"],
    });
  });

  it("answers null for files it doesn't know", async () => {
    expect(
      await readHints(source("x.zip", new TextEncoder().encode("hello"))),
    ).toBeNull();
    expect(
      await readHints(
        source("x.jar", zip([{ name: "readme.txt", data: "hi" }])),
      ),
    ).toBeNull();
  });
});

describe("readNbt", () => {
  it("reads both byte orders and refuses junk", () => {
    const value = { Name: { string: "hi" }, N: { long: 5n } };
    expect(readNbt(writeNbt(value)).value).toEqual({ Name: "hi", N: 5n });
    expect(
      readNbt(writeNbt(value, { little: true }), { little: true }).value,
    ).toEqual({
      Name: "hi",
      N: 5n,
    });
    expect(() => readNbt(new Uint8Array([10, 0]))).toThrow();
    expect(() => readNbt(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
