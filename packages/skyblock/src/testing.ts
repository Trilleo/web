/**
 * Small SkyShards-shaped source files for tests: five shards and a few recipes, with
 * `extra` shards (numbered fillers) when a test needs a bigger set.
 */
import type { SourceFiles } from "./sources";

export function sourceFiles(options: { extra?: number } = {}): SourceFiles {
  const shards: Record<string, Record<string, unknown>> = {
    C1: {
      name: "Grove",
      rarity: "common",
      type: "Global",
      fuse_amount: 2,
      internal_id: "SHARD_GROVE",
      synthesized: true,
      chameleon: true,
      family: "Elemental Family",
      recipe_type: null,
    },
    C4: {
      name: "Phanpyre",
      rarity: "common",
      type: "Foraging",
      fuse_amount: 5,
      internal_id: "SHARD_PHANPYRE",
      synthesized: true,
      chameleon: true,
      family: "Phantom Family",
      recipe_type: null,
    },
    U1: {
      name: "Bogged",
      rarity: "uncommon",
      type: "Fishing",
      fuse_amount: 2,
      internal_id: "SHARD_SEA_ARCHER",
      synthesized: false,
      chameleon: false,
      family: "",
      recipe_type: null,
    },
    R45: {
      name: "Crocodile",
      rarity: "rare",
      type: "Hunting",
      fuse_amount: 2,
      internal_id: "SHARD_CROCODILE",
      synthesized: true,
      chameleon: true,
      family: "Reptile and Croco Family",
      recipe_type: null,
    },
    L6: {
      name: "Tiamat",
      rarity: "legendary",
      type: "Hunting",
      fuse_amount: 2,
      internal_id: "SHARD_TIAMAT",
      synthesized: true,
      chameleon: true,
      family: "Reptile and Croco Family",
      recipe_type: null,
    },
  };
  const properties: Record<string, Record<string, unknown>> = {
    C1: {
      name: "Grove",
      rarity: "Common",
      category: "Forest",
      family: ["Elemental"],
      input1: "Common&Forest",
      input2: "Uncommon+",
      id_result: "Phanpyre",
      chameleon_result: ["Phanpyre"],
      id_origin: [],
      chameleon_origin: [],
    },
    C4: {
      name: "Phanpyre",
      rarity: "Common",
      category: "Forest",
      family: ["Phantom"],
      input1: "",
      input2: "",
      id_result: "Bogged",
      chameleon_result: [],
      id_origin: ["Grove"],
      chameleon_origin: ["Grove"],
    },
    U1: {
      name: "Bogged",
      rarity: "Uncommon",
      category: "Water",
      family: [],
      input1: "",
      input2: "",
      id_result: null,
      chameleon_result: [],
      id_origin: ["Phanpyre"],
      chameleon_origin: [],
    },
    R45: {
      name: "Crocodile",
      rarity: "Rare",
      category: "Combat",
      family: ["Reptile", "Croco"],
      input1: "",
      input2: "",
      id_result: "Tiamat",
      chameleon_result: [],
      id_origin: [],
      chameleon_origin: [],
    },
    L6: {
      name: "Tiamat",
      rarity: "Legendary",
      category: "Combat",
      family: ["Reptile", "Croco"],
      input1: "Crocodile Shard",
      input2: "Epic+&Combat",
      id_result: null,
      chameleon_result: [],
      id_origin: ["Crocodile"],
      chameleon_origin: [],
    },
  };
  const descriptions: Record<string, unknown> = {
    C1: {
      title: "Nature Elemental",
      id: "nature_elemental",
      description: [
        { t: "Grants ", c: "gray" },
        { range: [2, 20], unit: "", c: "red" },
        { t: "  Health", c: "red" },
        { t: ".", c: "gray" },
      ],
      how_to_hunt: [
        [
          { t: "- ", c: "gray" },
          { t: "Fused", c: "green" },
        ],
      ],
    },
    R45: {
      title: "Pure Reptile",
      id: "pure_reptile",
      description: [
        { t: "Grants a ", c: "gray" },
        { range: [2, 20], unit: "%", c: "green" },
        { t: " chance to double shards from a Reptile Fusion.", c: "gray" },
      ],
      how_to_hunt: [
        [
          { t: "- Purchased from ", c: "gray" },
          { t: "Kiara's Shop", c: "green" },
        ],
      ],
    },
  };
  const rates: Record<string, number> = {
    C1: 0,
    C4: 216,
    U1: 60,
    R45: 12,
    L6: 0,
  };
  const recipes: Record<string, Record<string, string[][]>> = {
    C1: {
      "2": [
        ["C4", "U1"],
        ["C4", "R45"],
      ],
    },
    L6: { "2": [["R45", "L6"]] },
    U1: {
      "1": [
        ["C4", "C1"],
        ["C1", "C1"],
      ],
    },
  };
  for (let i = 1; i <= (options.extra ?? 0); i++) {
    const key = `E${String(i)}`;
    shards[key] = {
      name: `Filler ${String(i)}`,
      rarity: "epic",
      type: "Combat",
      fuse_amount: 2,
      internal_id: `SHARD_FILLER_${String(i)}`,
      synthesized: true,
      chameleon: false,
      family: "",
      recipe_type: null,
    };
    properties[key] = {
      name: `Filler ${String(i)}`,
      rarity: "Epic",
      category: "Combat",
      family: [],
      input1: "",
      input2: "",
      id_result: null,
      chameleon_result: [],
      id_origin: [],
      chameleon_origin: [],
    };
  }
  return {
    fusionData: { recipes, shards },
    properties,
    descriptions,
    rates,
  };
}
