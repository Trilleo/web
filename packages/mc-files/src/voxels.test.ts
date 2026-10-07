import { describe, expect, it } from "vitest";
import {
  blockColour,
  blockHex,
  blockLabel,
  blockOccludes,
  blockShape,
} from "./blocks";
import { MAX_FACES, MeshError, buildMesh } from "./mesh";
import { PreviewError, decodePreview, encodePreview } from "./preview";
import { writeNbt, type NbtInput } from "./testing";
import {
  VoxelError,
  blockName,
  countBlocks,
  readVoxels,
  type VoxelModel,
} from "./voxels";

const at = (model: VoxelModel, x: number, y: number, z: number) =>
  model.palette[
    model.data[x + z * model.size[0] + y * model.size[0] * model.size[2]] ?? 0
  ];

const names = (list: string[]): NbtInput => ({
  of: 10,
  list: list.map((name) => ({ compound: { Name: { string: name } } })),
});

/** Packs values `bits` wide into longs, spanning longs (Litematica's way). */
function pack(values: number[], bits: number): bigint[] {
  const longs = new Array<bigint>(Math.ceil((values.length * bits) / 64)).fill(
    0n,
  );
  values.forEach((value, i) => {
    for (let b = 0; b < bits; b++) {
      if (!((value >> b) & 1)) continue;
      const bit = i * bits + b;
      const index = Math.floor(bit / 64);
      longs[index] = BigInt.asIntN(
        64,
        (longs[index] ?? 0n) | (1n << BigInt(bit % 64)),
      );
    }
  });
  return longs;
}

describe("blockName", () => {
  it("drops the namespace and states, and folds the airs", () => {
    expect(blockName("minecraft:oak_stairs[facing=east,half=top]")).toBe(
      "oak_stairs",
    );
    expect(blockName("minecraft:cave_air")).toBe("air");
    expect(blockName("structure_void")).toBe("air");
  });
});

describe("readVoxels", () => {
  it("reads a Litematica region, values spanning longs", async () => {
    // 3 × 2 × 4 with 5 kinds (3 bits): 24 values, 72 bits, so some span longs.
    const palette = [
      "minecraft:air",
      "minecraft:stone",
      "minecraft:oak_planks",
      "minecraft:glass",
      "minecraft:white_wool",
    ];
    const values = Array.from({ length: 24 }, (_, i) => i % 5);
    const bytes = writeNbt(
      {
        MinecraftDataVersion: { int: 4189 },
        Regions: {
          compound: {
            Main: {
              compound: {
                Position: {
                  compound: { x: { int: 0 }, y: { int: 0 }, z: { int: 0 } },
                },
                // A negative size grows the other way: same blocks.
                Size: {
                  compound: { x: { int: 3 }, y: { int: 2 }, z: { int: -4 } },
                },
                BlockStatePalette: names(palette),
                BlockStates: { longs: pack(values, 3) },
              },
            },
          },
        },
      },
      { gzip: true },
    );
    const model = await readVoxels(bytes, "tower.litematic");
    expect(model.size).toEqual([3, 2, 4]);
    // Index order: x fastest, then z, then y.
    for (let i = 0; i < 24; i++) {
      const x = i % 3;
      const z = Math.floor(i / 3) % 4;
      const y = Math.floor(i / 12);
      expect(at(model, x, y, z)).toBe(
        blockName(palette[values[i] ?? 0] ?? "air"),
      );
    }
  });

  it("reads Sponge v2 and v3 schematics (varint data)", async () => {
    // 2 × 1 × 1: a block with a big palette id needs two varint bytes.
    const v2 = writeNbt(
      {
        Version: { int: 2 },
        Width: { short: 2 },
        Height: { short: 1 },
        Length: { short: 1 },
        Palette: {
          compound: {
            "minecraft:air": { int: 0 },
            "minecraft:stone": { int: 200 },
          },
        },
        // 200 as a varint is 0xc8 0x01 (bytes are signed: 0xc8 is -56), then 0.
        BlockData: { bytes: [-56, 1, 0] },
      },
      { gzip: true },
    );
    const model = await readVoxels(v2, "x.schem");
    expect(model.size).toEqual([2, 1, 1]);
    expect(at(model, 0, 0, 0)).toBe("stone");
    expect(at(model, 1, 0, 0)).toBe("air");

    const v3 = writeNbt(
      {
        Schematic: {
          compound: {
            Version: { int: 3 },
            Width: { short: 1 },
            Height: { short: 2 },
            Length: { short: 1 },
            Blocks: {
              compound: {
                Palette: {
                  compound: {
                    "minecraft:glass": { int: 0 },
                    "minecraft:oak_log[axis=y]": { int: 1 },
                  },
                },
                Data: { bytes: [1, 0] },
              },
            },
          },
        },
      },
      { gzip: true },
    );
    const tall = await readVoxels(v3, "y.schem");
    expect([at(tall, 0, 0, 0), at(tall, 0, 1, 0)]).toEqual([
      "oak_log",
      "glass",
    ]);
  });

  it("reads vanilla and Bedrock structures", async () => {
    const nbt = writeNbt(
      {
        DataVersion: { int: 3953 },
        size: { of: 3, list: [{ int: 2 }, { int: 1 }, { int: 2 }] },
        palette: names(["minecraft:stone", "minecraft:dirt"]),
        blocks: {
          of: 10,
          list: [
            {
              compound: {
                pos: { of: 3, list: [{ int: 1 }, { int: 0 }, { int: 1 }] },
                state: { int: 1 },
              },
            },
            {
              compound: {
                pos: { of: 3, list: [{ int: 0 }, { int: 0 }, { int: 0 }] },
                state: { int: 0 },
              },
            },
          ],
        },
      },
      { gzip: true },
    );
    const vanilla = await readVoxels(nbt, "hut.nbt");
    expect([
      at(vanilla, 0, 0, 0),
      at(vanilla, 1, 0, 1),
      at(vanilla, 1, 0, 0),
    ]).toEqual(["stone", "dirt", "air"]);

    const bedrock = writeNbt(
      {
        format_version: { int: 1 },
        size: { of: 3, list: [{ int: 2 }, { int: 1 }, { int: 1 }] },
        structure: {
          compound: {
            block_indices: {
              of: 9,
              list: [
                { of: 3, list: [{ int: 0 }, { int: -1 }] },
                { of: 3, list: [{ int: -1 }, { int: -1 }] },
              ],
            },
            palette: {
              compound: {
                default: {
                  compound: {
                    block_palette: {
                      of: 10,
                      list: [
                        { compound: { name: { string: "minecraft:planks" } } },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      { little: true },
    );
    const structure = await readVoxels(bedrock, "house.mcstructure");
    expect([at(structure, 0, 0, 0), at(structure, 1, 0, 0)]).toEqual([
      "planks",
      "air",
    ]);
  });

  it("refuses what it can't show", async () => {
    await expect(
      readVoxels(new Uint8Array([10, 0, 0, 0]), "x.schematic"),
    ).rejects.toThrow(VoxelError);
    const huge = writeNbt({
      size: { of: 3, list: [{ int: 1000 }, { int: 1000 }, { int: 1000 }] },
      palette: names([]),
      blocks: { of: 10, list: [] },
    });
    await expect(readVoxels(huge, "big.nbt")).rejects.toThrow("too big");
  });
});

const sample: VoxelModel = {
  size: [3, 2, 2],
  palette: ["air", "stone", "glass", "torch"],
  data: Uint16Array.from([1, 1, 0, 2, 0, 0, 3, 0, 0, 0, 0, 1]),
};

describe("previews", () => {
  it("round-trip, and count the blocks", async () => {
    const bytes = await encodePreview(sample);
    const back = await decodePreview(bytes);
    expect(back.size).toEqual(sample.size);
    expect(back.palette).toEqual(sample.palette);
    expect([...back.data]).toEqual([...sample.data]);
    expect(countBlocks(back)).toEqual([
      { block: "stone", count: 3 },
      { block: "glass", count: 1 },
      { block: "torch", count: 1 },
    ]);
  });

  it("refuses anything that isn't a well-formed preview", async () => {
    await expect(decodePreview(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      PreviewError,
    );
    const good = await encodePreview(sample);
    // More blocks than its box holds.
    const lying = await encodePreview({ ...sample, size: [3, 2, 1] });
    await expect(decodePreview(lying)).rejects.toThrow(PreviewError);
    // Cut short.
    await expect(
      decodePreview(good.subarray(0, good.length - 8)),
    ).rejects.toThrow(PreviewError);
    // A palette entry with markup in it.
    const script = await encodePreview({
      ...sample,
      palette: ["air", "<script>", "glass", "torch"],
    });
    await expect(decodePreview(script)).rejects.toThrow("palette");
  });
});

describe("buildMesh", () => {
  it("draws only the faces you can see", () => {
    const one: VoxelModel = {
      size: [1, 1, 1],
      palette: ["air", "stone"],
      data: Uint16Array.from([1]),
    };
    expect(buildMesh(one).faces).toBe(6);
    const two: VoxelModel = {
      size: [2, 1, 1],
      palette: ["air", "stone"],
      data: Uint16Array.from([1, 1]),
    };
    expect(buildMesh(two).faces).toBe(10);
    // Glass doesn't hide the stone behind it.
    const glass: VoxelModel = {
      size: [2, 1, 1],
      palette: ["air", "stone", "glass"],
      data: Uint16Array.from([1, 2]),
    };
    expect(buildMesh(glass).faces).toBe(11);
    // Cutting off the top layer shows the one below.
    const tower: VoxelModel = {
      size: [1, 2, 1],
      palette: ["air", "stone"],
      data: Uint16Array.from([1, 1]),
    };
    expect(buildMesh(tower).faces).toBe(10);
    expect(buildMesh(tower, 1).faces).toBe(6);
    expect(buildMesh(tower, 0).faces).toBe(0);
  });

  it("shades faces by direction and gives up on huge builds", () => {
    const one: VoxelModel = {
      size: [1, 1, 1],
      palette: ["air", "stone"],
      data: Uint16Array.from([1]),
    };
    const mesh = buildMesh(one);
    expect(mesh.positions.length).toBe(6 * 4 * 3);
    expect(mesh.indices.length).toBe(6 * 6);
    // The top face is the stone's own colour; the bottom darker.
    expect([...mesh.colours.slice(0, 3)]).toEqual([0x7d, 0x7d, 0x7d]);
    expect(mesh.colours[12]).toBeLessThan(0x7d);

    const side = Math.ceil(Math.cbrt(MAX_FACES / 3)) + 2;
    const checker: VoxelModel = {
      size: [side, side, side],
      palette: ["air", "stone"],
      data: Uint16Array.from({ length: side ** 3 }, (_, i) => {
        const x = i % side;
        const z = Math.floor(i / side) % side;
        const y = Math.floor(i / side / side);
        return (x + y + z) % 2;
      }),
    };
    expect(() => buildMesh(checker)).toThrow(MeshError);
  });
});

describe("blocks", () => {
  it("colours, shapes and names blocks", () => {
    expect(blockHex("stone")).toBe("#7d7d7d");
    expect(blockColour("red_wool")).toBe(0xa12722);
    expect(blockColour("spruce_planks")).toBe(0x725431);
    expect(blockColour("spruce_log")).not.toBe(0x725431);
    expect(blockColour("stone_brick_stairs")).toBe(blockColour("stone_bricks"));
    expect(blockColour("totally_new_block")).toBe(0x8c8c8c);
    expect(blockShape("torch")).toBe("small");
    expect(blockShape("white_carpet")).toBe("flat");
    expect(blockShape("oak_slab")).toBe("slab");
    expect(blockOccludes("stone")).toBe(true);
    expect(blockOccludes("glass")).toBe(false);
    expect(blockLabel("oak_planks")).toBe("Oak planks");
  });
});
